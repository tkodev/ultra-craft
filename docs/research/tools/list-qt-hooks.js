for (const m of Process.enumerateModules()) {
 if (!/QtCore|QtNetwork|ssl|Security/.test(m.name)) continue;
 const matches = m.enumerateExports().filter(e => /toEncoded|createRequest|SSL_write|SSLWrite/.test(e.name));
 send({module:m.name,matches:matches.map(e=>({name:e.name,address:e.address.toString()}))});
}
