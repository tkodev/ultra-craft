let events = 0;
function emit(payload) { if (events++ < 300) send(payload); }
function safeUrl(raw) {
 let value = raw.replace(/^(https?:\/\/)[^\/@]+@/i, '$1').split('#')[0];
 const split = value.indexOf('?');
 let path = split < 0 ? value : value.slice(0, split);
 path = path.replace(/\/(token|key|secret|password|auth)\/[^/]+/gi, '/$1/<redacted>');
 if(split < 0) return path;
 const query = value.slice(split+1).split('&').map(part => {
  const index=part.indexOf('='); const key=index<0?part:part.slice(0,index); const val=index<0?'':part.slice(index+1);
  return key+'='+(/^(page|pageNum|pageSize|size|current|limit|offset)$/i.test(key)&&/^\d+$/.test(val)?val:'<redacted>');
 });
 return path+'?'+query.join('&');
}
const core=Process.getModuleByName('QtCore');
const toEncoded=core.enumerateExports().find(e=>e.name.includes('QUrl9toEncoded'));
Interceptor.attach(toEncoded.address,{
 onEnter(){this.output=this.context.x8;},
 onLeave(){try{
  const size=Number(this.output.add(16).readS64());if(size<8||size>8192)return;
  const raw=this.output.add(8).readPointer().readUtf8String(size);
  if(/^https?:\/\//.test(raw))emit({kind:'url',url:safeUrl(raw),thread:Process.getCurrentThreadId()});
 }catch{}}
});
const network=Process.getModuleByName('QtNetwork');
const create=network.enumerateExports().find(e=>e.name.includes('QNetworkAccessManager13createRequest'));
Interceptor.attach(create.address,{onEnter(args){const op=args[1].toInt32();emit({kind:'request',method:({1:'HEAD',2:'GET',3:'PUT',4:'POST',5:'DELETE',6:'CUSTOM'})[op]||'unknown',thread:Process.getCurrentThreadId()});}});
const ssl=Process.getModuleByName('libssl.3.dylib');
const getServerName=new NativeFunction(ssl.getExportByName('SSL_get_servername'),'pointer',['pointer','int']);
function traceWrite(args){try{
 const size=args[2].toInt32();if(size<10)return;
 let line='';for(let i=0;i<Math.min(size,2048);i++){const c=args[1].add(i).readU8();if(c===10)break;if(c!==13)line+=String.fromCharCode(c);}
 const match=/^(GET|POST|PUT|DELETE|HEAD|PATCH|OPTIONS) (\S+) HTTP\//.exec(line);if(!match)return;
 const p=getServerName(args[0],0);const host=p.isNull()?'unknown-host':p.readUtf8String();
 emit({kind:'http',method:match[1],url:safeUrl('https://'+host+match[2])});
}catch{}}
for(const name of ['SSL_write','SSL_write_ex']){const address=ssl.findExportByName(name);if(address)Interceptor.attach(address,{onEnter:traceWrite});}
const ready=new File('/tmp/ultra-craft-research/store-trace-ready.txt','w');ready.write('hooks ready for pid '+Process.id);ready.close();
emit({kind:'ready',pid:Process.id});
