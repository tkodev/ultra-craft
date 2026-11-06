import { copy } from './constants/copy.mjs';
import { element as el } from './widgets.mjs';
function field(label, value = '', type = 'text') {
  const node = el('label', 'field', label), input = el('input'); input.type = type; input.value = value;
  input.autocomplete = type === 'password' ? 'off' : 'on'; node.append(input); return { node, input };
}
async function request(url, data) {
  const response = await fetch(url, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) } : { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(); return response.json();
}
export async function mountConnections(container) {
  let settings;
  try { settings = await request('/api/connections'); if (!settings?.truenas || !settings?.beszel) throw new Error(); } catch { container.replaceChildren(el('p', 'error', copy.connectionFailed)); return; }
  container.replaceChildren(el('h2', '', copy.sources));
  const panels = el('div', 'panels'); container.append(panels);
  for (const kind of ['truenas', 'beszel']) {
    const panel = el('section', 'panel'), form = el('form'); panel.append(el('h3', '', copy[kind]));
    const address = field(copy.serverAddress, settings[kind]?.url || ''), name = field(copy.serverName, settings[kind]?.name || copy[kind]);
    address.input.required = true; address.input.type = 'url'; name.input.maxLength = 100;
    const status = el('p', 'hint'); status.setAttribute('role', 'status');
    form.append(address.node, name.node);
    if (kind === 'truenas') {
      const key = field(copy.apiKey, '', 'password'); key.input.placeholder = settings.truenas.hasCredential ? copy.savedCredential : '';
      form.append(key.node); const save = el('button', 'primary', copy.saveConnection); save.type = 'submit'; form.append(save);
      form.addEventListener('submit', async event => {
        event.preventDefault(); save.disabled = true;
        try {
          settings = await request('/api/connections/truenas', { url: address.input.value, name: name.input.value, ...(key.input.value ? { key: key.input.value } : {}) });
          key.input.value = ''; key.input.placeholder = copy.savedCredential; status.textContent = copy.connectionSaved;
        } catch { status.textContent = copy.connectionFailed; }
        finally { save.disabled = false; }
      });
    } else {
      const identity = field(copy.email, '', 'email'), password = field(copy.password, '', 'password');
      identity.input.autocomplete = 'username'; password.input.autocomplete = 'current-password';
      const signIn = el('button', 'primary', copy.signIn); signIn.type = 'submit';
      form.append(identity.node, password.node, signIn, el('p', 'hint', copy.signInNote));
      const selector = el('label', 'field', copy.selectSystem), select = el('select'); selector.append(select);
      const load = el('button', '', copy.loadSystems), use = el('button', '', copy.saveSystem); load.type = use.type = 'button'; use.disabled = true;
      async function systems() {
        const result = await request('/api/connections/beszel/systems'); select.replaceChildren();
        for (const system of result.systems) { const option = el('option', '', system.name); option.value = system.id; select.append(option); }
        if (result.systems.some(system => system.id === settings.beszel.systemId)) select.value = settings.beszel.systemId;
        use.disabled = result.systems.length === 0;
      }
      form.addEventListener('submit', async event => {
        event.preventDefault(); signIn.disabled = true;
        try {
          settings = await request('/api/connections/beszel/login', { url: address.input.value, name: name.input.value, identity: identity.input.value, password: password.input.value });
          status.textContent = copy.connectionSaved; await systems();
        } catch { status.textContent = copy.connectionFailed; }
        finally { password.input.value = ''; signIn.disabled = false; }
      });
      load.addEventListener('click', async () => { load.disabled = true; try { await systems(); } catch { status.textContent = copy.connectionFailed; } finally { load.disabled = false; } });
      use.addEventListener('click', async () => { use.disabled = true; try { settings = await request('/api/connections/beszel', { systemId: select.value }); status.textContent = copy.connectionSaved; } catch { status.textContent = copy.connectionFailed; } finally { use.disabled = !select.options.length; } });
      form.append(load, selector, use);
    }
    panel.append(form, status); panels.append(panel);
  }
}
