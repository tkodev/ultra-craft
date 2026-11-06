import zipfile,struct,json,hashlib,sys
from pathlib import Path
apk=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/tmp/ultra-craft-research/LineOS.apk')
target=sys.argv[2] if len(sys.argv)>2 else 'Lcom/ultrabar/launch/common/utils/Constants;'
results=[]
with zipfile.ZipFile(apk) as z:
 for name in z.namelist():
  if not name.endswith('.dex'):continue
  b=z.read(name)
  u32=lambda o:struct.unpack_from('<I',b,o)[0]
  def leb(o):
   v=0;s=0
   while True:
    n=b[o];o+=1;v|=(n&127)<<s
    if n<128:return v,o
    s+=7
  ss,so=u32(0x38),u32(0x3c)
  strings=[]
  for i in range(ss):
   p=u32(so+i*4);_,p=leb(p);e=b.index(0,p);strings.append(b[p:e].decode('utf-8',errors='replace'))
  ts,to=u32(0x40),u32(0x44)
  types=[strings[u32(to+i*4)] for i in range(ts)]
  if target not in types:continue
  fs,fo=u32(0x50),u32(0x54)
  fields=[]
  for i in range(fs):
   c,t,n=struct.unpack_from('<HHI',b,fo+i*8);fields.append((types[c],types[t],strings[n]))
  cs,co=u32(0x60),u32(0x64)
  for i in range(cs):
   row=co+i*32
   if types[u32(row)]!=target:continue
   cd=u32(row+24);sv=u32(row+28)
   static_count,p=leb(cd)
   for _ in range(3):_,p=leb(p)
   static_fields=[];index=0
   for _ in range(static_count):
    delta,p=leb(p);access,p=leb(p);index+=delta;static_fields.append(fields[index])
   count,q=leb(sv)
   for field in static_fields[:count]:
    offset=q;head=b[q];q+=1;kind=head&31;arg=head>>5
    if kind in (0x1e,0x1f): value=None if kind==0x1e else bool(arg)
    else:
     raw=b[q:q+arg+1];q+=arg+1
     value=int.from_bytes(raw,'little',signed=kind in (0,2,4,6))
     if kind==0x17:value=strings[value]
    if field[2] in ['HTTP_PORT','TCP_COMMUNICATION_PORT','LAN_DISCOVERY_PORT']:
     results.append({'member':field[2],'value':value,'dex':name,'offset':hex(offset)})
print(json.dumps({'tool':'ordinary Python DEX encoded_array parser; not REA Evidence','apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'constants':results},indent=2))
