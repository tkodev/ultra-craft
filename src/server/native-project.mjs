import { DatabaseSync } from 'node:sqlite';
import { copyFile, mkdir, chmod, stat, readFile, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

function openProject(path, readOnly = true) {
  const db = new DatabaseSync(path, { readOnly });
  try {
    db.exec('PRAGMA trusted_schema=OFF');
    const table = db.prepare("SELECT type FROM sqlite_master WHERE name='json_store'").get();
    if (table?.type !== 'table') throw new Error('Unsupported native project schema');
    const normalize = sql => sql.toLowerCase().replace(/\s+/g, '');
    const timestampTrigger = (name, table, key) => normalize(`CREATE TRIGGER ${name} AFTER UPDATE ON ${table} FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at BEGIN UPDATE ${table} SET updated_at = strftime('%s','now') WHERE ${key}; END`);
    const allowedTriggers = new Map([
      ['trg_json_store_updated', timestampTrigger('trg_json_store_updated', 'json_store', 'id = OLD.id')],
      ['trg_file_store_updated', timestampTrigger('trg_file_store_updated', 'file_store', 'owner_id = OLD.owner_id AND file_name = OLD.file_name')],
      ['trg_property_store_updated', timestampTrigger('trg_property_store_updated', 'property_store', 'property_name = OLD.property_name')],
    ]);
    for (const entry of db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('view','trigger')").all()) {
      if (entry.type !== 'trigger' || allowedTriggers.get(entry.name) !== normalize(entry.sql)) throw new Error('Unsupported native project schema');
    }
    const fields = db.prepare('PRAGMA table_info(json_store)').all().map(row => row.name);
    if (!['id', 'type', 'k1', 'columns', 'data', 'sort_id'].every(name => fields.includes(name))) throw new Error('Unsupported native project schema');
    if (db.prepare('SELECT count(*) AS count FROM json_store').get().count > 5000) throw new Error('Native project is too large');
    return db;
  } catch (error) { db.close(); throw error; }
}
function object(raw) {
  if (typeof raw !== 'string' || raw.length > 1048576) throw new Error('Invalid native project record');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid native project record');
  return data;
}
export function summarizeNativeProject(path) {
  const db = openProject(path);
  try {
    const rows = db.prepare('SELECT id,type,k1,"columns",data,sort_id FROM json_store ORDER BY sort_id,id').all();
    const profiles = rows.filter(row => row.type === 'profile').map(row => {
      const attributes = object(row.columns);
      return { id: row.id, name: String(attributes.name ?? '').slice(0, 100), preferred: attributes.preferred === true,
        widgets: rows.filter(widget => widget.type === 'profileCbWidget' && widget.k1 === String(row.id)).map(widget => {
          const attributes = object(widget.columns), config = object(widget.data);
          return { id: widget.id, name: String(attributes.name ?? '').slice(0, 100), kind: String(attributes.widgetType ?? ''), nativeType: String(config.deploymentData?.type ?? ''), order: widget.sort_id };
        }) };
    });
    return { format: 'umpf-sqlite', profiles, moduleCount: rows.filter(row => row.type === 'module').length };
  } finally { db.close(); }
}
export function renameNativeProfile(path, id, name) {
  if (!Number.isSafeInteger(id) || typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Invalid profile name');
  const db = openProject(path, false);
  try {
    const row = db.prepare('SELECT "columns" FROM json_store WHERE id=? AND type=?').get(id, 'profile');
    if (!row) throw new Error('Unknown native profile');
    const attributes = object(row.columns); attributes.name = name.trim();
    db.prepare('UPDATE json_store SET "columns"=? WHERE id=? AND type=?').run(JSON.stringify(attributes), id, 'profile');
  } finally { db.close(); }
}

export function reorderNativeWidgets(path, profileId, ids) {
  if (!Number.isSafeInteger(profileId) || !Array.isArray(ids) || !ids.every(Number.isSafeInteger) || new Set(ids).size !== ids.length) throw new Error('Invalid widget order');
  const db = openProject(path, false);
  try {
    const current = db.prepare('SELECT id FROM json_store WHERE type=? AND k1=?').all('profileCbWidget', String(profileId)).map(row => row.id);
    if (current.length !== ids.length || current.some(id => !ids.includes(id))) throw new Error('Widget order must preserve every native widget');
    db.exec('BEGIN IMMEDIATE');
    try {
      const update = db.prepare('UPDATE json_store SET sort_id=? WHERE id=? AND type=? AND k1=?');
      ids.forEach((id, index) => update.run(index, id, 'profileCbWidget', String(profileId)));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } finally { db.close(); }
}
export function renameNativeWidget(path, id, name) {
  if (!Number.isSafeInteger(id) || typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Invalid widget name');
  const db = openProject(path, false);
  try {
    const row = db.prepare('SELECT "columns",data FROM json_store WHERE id=? AND type=?').get(id, 'profileCbWidget');
    if (!row) throw new Error('Unknown native widget');
    const attributes = object(row.columns), data = object(row.data);
    attributes.name = name.trim(); data.name = name.trim();
    if (data.deploymentData && typeof data.deploymentData === 'object') data.deploymentData.name = name.trim();
    db.prepare('UPDATE json_store SET "columns"=?,data=? WHERE id=? AND type=?').run(JSON.stringify(attributes), JSON.stringify(data), id, 'profileCbWidget');
  } finally { db.close(); }
}

export function createNativeProfile(path, name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Invalid profile name');
  const db = openProject(path, false);
  try {
    const count = db.prepare('SELECT count(*) AS count FROM json_store WHERE type=?').get('profile').count;
    if (count >= 50) throw new Error('Native profile limit reached');
    const preferred = count === 0;
    db.prepare('INSERT INTO json_store(type,k1,"columns",data,sort_id) VALUES(?,?,?,?,?)').run('profile', String(preferred),
      JSON.stringify({ name: name.trim(), icon: '', preferred, showName: false }), JSON.stringify({ moduleConfigList: [], widgetConfigList: [] }), count);
  } finally { db.close(); }
}
export function setNativeDefaultProfile(path, id) {
  if (!Number.isSafeInteger(id)) throw new Error('Invalid native profile ID');
  const db = openProject(path, false);
  try {
    const rows = db.prepare('SELECT id,"columns" FROM json_store WHERE type=?').all('profile');
    if (!rows.some(row => row.id === id)) throw new Error('Unknown native profile');
    db.exec('BEGIN IMMEDIATE');
    try {
      const update = db.prepare('UPDATE json_store SET k1=?,"columns"=? WHERE id=? AND type=?');
      for (const row of rows) {
        const attributes = object(row.columns); attributes.preferred = row.id === id;
        update.run(String(attributes.preferred), JSON.stringify(attributes), row.id, 'profile');
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } finally { db.close(); }
}

export function createNativeProject(source, workingCopy) {
  let initializing;
  const ensure = async () => {
    if (!source) throw new Error('Configure NATIVE_PROJECT_FILE first');
    if (!initializing) initializing = (async () => {
      if ((await stat(source)).size > 20 * 1024 * 1024) throw new Error('Native project exceeds 20 MB');
      await mkdir(dirname(workingCopy), { recursive: true, mode: 0o700 });
      try { await copyFile(source, workingCopy, constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      await chmod(workingCopy, 0o600);
      summarizeNativeProject(workingCopy);
    })().catch(error => { initializing = null; throw error; });
    return initializing;
  };
  return {
    async summary() { await ensure(); return summarizeNativeProject(workingCopy); },
    async create(name) { await ensure(); createNativeProfile(workingCopy, name); return summarizeNativeProject(workingCopy); },
    async setDefault(id) { await ensure(); setNativeDefaultProfile(workingCopy, id); return summarizeNativeProject(workingCopy); },
    async rename(id, name) { await ensure(); renameNativeProfile(workingCopy, id, name); return summarizeNativeProject(workingCopy); },
    async reorder(profileId, ids) { await ensure(); reorderNativeWidgets(workingCopy, profileId, ids); return summarizeNativeProject(workingCopy); },
    async renameWidget(id, name) { await ensure(); renameNativeWidget(workingCopy, id, name); return summarizeNativeProject(workingCopy); },
    async export() {
      await ensure();
      const temporary = `${workingCopy}.${randomUUID()}.export`;
      try {
        await copyFile(workingCopy, temporary, constants.COPYFILE_EXCL); await chmod(temporary, 0o600);
        const db = openProject(temporary, false);
        try {
          for (const row of db.prepare('SELECT id,"columns" FROM json_store WHERE type=?').all('host')) {
            const attributes = object(row.columns); attributes.token = '';
            db.prepare('UPDATE json_store SET "columns"=? WHERE id=?').run(JSON.stringify(attributes), row.id);
          }
          // Erase old credential bytes from free pages in the downloadable copy.
          db.exec('VACUUM');
        } finally { db.close(); }
        return await readFile(temporary);
      } finally { await unlink(temporary).catch(() => {}); }
    },
  };
}
