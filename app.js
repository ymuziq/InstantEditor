'use strict';
const $=id=>document.getElementById(id);
const source=$('source'),result=$('result');
const state={image:null,frame:null,fileName:'Instant',bounds:[.055,.945,.075,.865],drag:null};
const settings=['size','zoom','moveX','moveY','brightness','blur','textureStrength','textureScale'];
const defaults={size:72,zoom:100,moveX:0,moveY:0,brightness:85,blur:10,textureStrength:20,textureScale:30};
const DEFAULT_TEXTURE_COLOR='#5d5d5d';
const sizes={'4:5':[1080,1350],'1:1':[1080,1080],'3:4':[1080,1440],'2:3':[1080,1620],'9:16':[1080,1920],'3:2':[1620,1080],'16:9':[1920,1080]};
const status=msg=>$('status').textContent=msg;
let lastNotice={key:'startStatus',args:[]};
function notify(key,...args){lastNotice={key,args};status(t(key,...args));}

// Korean / English interface. The preferred language persists between launches.
const TRANSLATIONS={
 ko:{open:'사진 불러오기',sourceHeading:'원본 · 사진 영역',detect:'자동 검출',dragHint:'초록색 모서리 또는 변을 손가락으로 드래그하세요.',resultHeading:'최종 결과',layout:'레이아웃',ratio:'출력 비율',size:'중앙 사진 너비',backgroundHeading:'배경 종류',backgroundChoice:'배경 선택',photoHeading:'사진 확대 배경',zoom:'배경 확대',moveX:'좌우 이동',moveY:'상하 이동',brightness:'밝기',blur:'배경 블러',textureHeading:'재질 배경',textureKind:'재질 종류',textureStrength:'질감 강도',textureScale:'무늬 크기',textureColor:'배경 색상',newPattern:'새로운 패턴 생성',reset:'레이아웃 초기화',clearPhoto:'사진 초기화',save:'JPEG 저장',footerHint:'재질 배경 4종을 지원합니다. 브라우저와 PC 버전의 이미지 처리 방식이 달라 결과가 완전히 같지는 않을 수 있습니다.',startStatus:'사진을 불러오면 편집할 수 있어요.',ratioInstagram:'4:5 (인스타그램)',ratioSquare:'1:1 (정사각형)',ratioPortrait:'3:4 (세로)',ratioPortrait2:'2:3 (세로)',ratioStory:'9:16 (스토리)',ratioLandscape:'3:2 (가로)',ratioWide:'16:9 (가로)',photoMode:'사진 확대',textureMode:'재질 배경',concrete:'콘크리트',marble:'대리석',paper:'빈티지 종이',stone:'어두운 석재',emptyPhoto:'사진을 불러오세요',preview:'미리보기',textureLoadError:'재질 이미지 오류',textureNotReady:'재질 이미지가 아직 준비되지 않았습니다.',openError:'사진을 열지 못했습니다',loaded:name=>`불러옴: ${name} · 초록색 경계는 터치로 조절할 수 있어요.`,fileLoadError:name=>`${name} 파일을 불러오지 못했습니다`,jpegError:'JPEG 생성 실패',saveRequested:'JPEG 저장을 요청했습니다. 휴대폰에서는 다운로드 폴더를 확인하세요.',saveError:'저장 실패',textureErrorDetail:e=>'재질 이미지 오류: '+e,openErrorDetail:e=>'사진을 열지 못했습니다: '+e,saveErrorDetail:e=>'저장 실패: '+e},
 en:{open:'Open Photo',sourceHeading:'Original · Photo Area',detect:'Auto Detect',dragHint:'Drag the green corners or edges to adjust the photo area.',resultHeading:'Final Result',layout:'Layout',ratio:'Output Ratio',size:'Center Photo Width',backgroundHeading:'Background Type',backgroundChoice:'Choose Background',photoHeading:'Enlarged Photo Background',zoom:'Background Zoom',moveX:'Horizontal Position',moveY:'Vertical Position',brightness:'Brightness',blur:'Background Blur',textureHeading:'Textured Background',textureKind:'Texture Type',textureStrength:'Texture Strength',textureScale:'Pattern Size',textureColor:'Background Color',newPattern:'Generate New Pattern',reset:'Reset Layout',clearPhoto:'Clear Photo',save:'Save JPEG',footerHint:'Four textures are available. Browser and desktop image processing may produce slightly different results.',startStatus:'Open a photo to start editing.',ratioInstagram:'4:5 (Instagram)',ratioSquare:'1:1 (Square)',ratioPortrait:'3:4 (Portrait)',ratioPortrait2:'2:3 (Portrait)',ratioStory:'9:16 (Story)',ratioLandscape:'3:2 (Landscape)',ratioWide:'16:9 (Landscape)',photoMode:'Enlarged Photo',textureMode:'Textured Background',concrete:'Concrete',marble:'Marble',paper:'Vintage Paper',stone:'Dark Stone',emptyPhoto:'Open a photo',preview:'Preview',textureLoadError:'Texture loading error',textureNotReady:'Texture images are not ready yet.',openError:'Unable to open photo',loaded:name=>`Loaded: ${name} · Drag the green edges to adjust the photo area.`,fileLoadError:name=>`Could not load ${name}`,jpegError:'JPEG creation failed',saveRequested:'JPEG download requested. Check your Downloads folder on mobile.',saveError:'Save failed',textureErrorDetail:e=>'Texture loading error: '+e,openErrorDetail:e=>'Unable to open photo: '+e,saveErrorDetail:e=>'Save failed: '+e}
};
let currentLang=(()=>{try{return localStorage.getItem('Instant-language')||((navigator.language||'').toLowerCase().startsWith('ko')?'ko':'en');}catch{return (navigator.language||'').toLowerCase().startsWith('ko')?'ko':'en';}})();
if(!TRANSLATIONS[currentLang])currentLang='en';
const t=(key,...args)=>{const msg=TRANSLATIONS[currentLang][key]??key;return typeof msg==='function'?msg(...args):msg;};
function applyLanguage(lang){
 currentLang=lang;document.documentElement.lang=lang;
 document.querySelectorAll('[data-i18n]').forEach(el=>{if(el.id!=='status')el.textContent=t(el.dataset.i18n);});
 for(const code of ['ko','en'])$('lang'+code[0].toUpperCase()+code.slice(1)).setAttribute('aria-pressed',String(lang===code));
 try{localStorage.setItem('Instant-language',lang);}catch{}
 // Status changes only if it still contains the initial message.
 status(t(lastNotice.key,...lastNotice.args));
 schedule();
}
$('langKo').addEventListener('click',()=>applyLanguage('ko'));
$('langEn').addEventListener('click',()=>applyLanguage('en'));

const v=id=>Number($(id).value);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const fitRect=(sw,sh,dw,dh)=>{const s=Math.min(dw/sw,dh/sh);return {x:(dw-sw*s)/2,y:(dh-sh*s)/2,w:sw*s,h:sh*s};};
const textureImages={};
let textureSeed=42,textureCache={key:null,canvas:null};
const textureNames=['concrete','marble','paper','stone'];
function textureKey(ow,oh){return [ow,oh,$('textureKind').value,$('textureColor').value,v('textureStrength'),v('textureScale'),textureSeed].join('|');}
async function loadTextures(){
 const entries=await Promise.all(textureNames.map(async name=>{
   const response=await fetch(`Instant_textures/${name}.jpg`);
   if(!response.ok)throw new Error(t('fileLoadError',`${name}.jpg`));
   const blob=await response.blob();
   const bitmap=await createImageBitmap(blob);
   return [name,bitmap];
 }));
 for(const [name,img] of entries)textureImages[name]=img;
 schedule();
}
loadTextures().catch(e=>{console.error(e);notify('textureErrorDetail',e.message);});
function updateMode(){
 const isTexture=$('bgMode').value==='texture';
 $('photoOptions').hidden=isTexture;$('textureOptions').hidden=!isTexture;
 schedule();
}
$('bgMode').addEventListener('change',updateMode);
$('textureKind').addEventListener('change',schedule);
$('textureColor').addEventListener('input',schedule);
$('newPattern').addEventListener('click',()=>{textureSeed=(Math.random()*2147483647)|0;schedule();});
let timer;
function schedule(){clearTimeout(timer);timer=setTimeout(draw,65);}
// Clear both previews AND hide the canvas elements until a new photo is rendered.
// Hiding avoids stale composited canvas frames remaining visible on mobile browsers.
function clearPreviews(){
  clearTimeout(timer);
  for(const canvas of [source,result]){
    canvas.style.visibility='hidden';
    canvas.width=1;
    canvas.height=1;
    canvas.getContext('2d').clearRect(0,0,1,1);
  }
}

settings.forEach(id=>{$(id).addEventListener('input',()=>{$(id+'Val').textContent=$(id).value+(id==='blur'?'':'%');schedule();});});
$('ratio').addEventListener('change',schedule);
$('reset').addEventListener('click',()=>{
  for(const [id,value] of Object.entries(defaults)){
    $(id).value=value;
    $(id).dispatchEvent(new Event('input'));
  }
  $('textureColor').value=DEFAULT_TEXTURE_COLOR;
  textureCache={key:null,canvas:null};
  schedule();
});
// Clear only the loaded photo; retain all layout settings and language.
let loadGeneration=0;
$('clearPhoto').addEventListener('click',()=>{
  loadGeneration++;
  state.image=null;
  state.frame=null;
  state.fileName='Instant';
  state.bounds=[.055,.945,.075,.865];
  state.drag=null;
  lastLayout=null;
  $('file').value=''; // Allows loading the same photo again.
  $('save').disabled=true;
  $('detect').disabled=true;
  $('clearPhoto').disabled=true;
  notify('startStatus');
  clearPreviews();
});
$('file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  const generation=++loadGeneration;
  try{
    const bitmap=await createImageBitmap(file);
    // Large mobile photos are downscaled for responsive processing; output remains at selected output size.
    const scale=Math.min(1,2500/Math.max(bitmap.width,bitmap.height));
    const c=makeCanvas(Math.round(bitmap.width*scale),Math.round(bitmap.height*scale));
    c.getContext('2d',{willReadFrequently:true}).drawImage(bitmap,0,0,c.width,c.height);
    bitmap.close?.();if(generation!==loadGeneration)return;state.image=c;state.frame=extractFrame(c);state.fileName=file.name.replace(/\.[^.]+$/,'');
    autoDetect();$('save').disabled=false;$('detect').disabled=false;$('clearPhoto').disabled=false;
    notify('loaded',file.name);
  }catch(err){if(generation!==loadGeneration)return;console.error(err);notify('openErrorDetail',err.message);}
});
// Python detect_frame analogue: bright connected regions, constrained by area, size and shape.
function extractFrame(c){
 const w=c.width,h=c.height,ds=Math.min(1,600/Math.max(w,h)),cw=Math.max(1,Math.round(w*ds)),ch=Math.max(1,Math.round(h*ds));
 const sm=makeCanvas(cw,ch),cx=sm.getContext('2d',{willReadFrequently:true});cx.drawImage(c,0,0,cw,ch);
 const a=cx.getImageData(0,0,cw,ch).data, mask=new Uint8Array(cw*ch),visited=new Uint8Array(cw*ch);
 for(let i=0;i<mask.length;i++){const k=i*4;mask[i]=(a[k]*.299+a[k+1]*.587+a[k+2]*.114>=185)?1:0;}
 const stack=new Int32Array(mask.length);let candidate=null;
 for(let start=0;start<mask.length;start++){
   if(!mask[start]||visited[start])continue;
   let top=0,head=0,minX=cw,minY=ch,maxX=0,maxY=0,count=0;
   visited[start]=1;stack[top++]=start;
   while(head<top){const p=stack[head++],x=p%cw,y=(p/cw)|0;count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     const neighbors=[x>0?p-1:-1,x<cw-1?p+1:-1,y>0?p-cw:-1,y<ch-1?p+cw:-1];
     for(const n of neighbors){if(n>=0&&mask[n]&&!visited[n]){visited[n]=1;stack[top++]=n;}}
   }
   const bw=maxX-minX+1,bh=maxY-minY+1,area=bw*bh,ratio=bw/bh;
   if(area>.15*cw*ch&&ratio>.65&&ratio<1.3&&bw>.35*cw&&bh>.35*ch&&(!candidate||area>candidate.area))candidate={minX,minY,bw,bh,area};
 }
 if(candidate&&candidate.area<.93*cw*ch&&candidate.minX>2&&candidate.minY>2&&candidate.minX+candidate.bw<cw-2&&candidate.minY+candidate.bh<ch-2){
   const x=Math.round(candidate.minX/ds),y=Math.round(candidate.minY/ds),rw=Math.min(w-x,Math.round(candidate.bw/ds)),rh=Math.min(h-y,Math.round(candidate.bh/ds));
   const out=makeCanvas(rw,rh);out.getContext('2d').drawImage(c,x,y,rw,rh,0,0,rw,rh);return out;
 }
 return c;
}
function autoDetect(){
 const c=state.frame;if(!c)return;
 const {width:w,height:h}=c,ctx=c.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,w,h).data;
 // Median over a few central strips approximates the Python gray profile detector.
 const brightness=(x,y)=>{const i=(y*w+x)*4;return pixels[i]*.299+pixels[i+1]*.587+pixels[i+2]*.114;};
 const median=values=>{values.sort((a,b)=>a-b);return values[(values.length/2)|0];};
 const xp=new Float32Array(w),yp=new Float32Array(h);
 for(let x=0;x<w;x++){const a=[];for(let j=0;j<21;j++)a.push(brightness(x,Math.min(h-1,Math.floor(h*(.28+j*.4/20)))));xp[x]=median(a);}
 for(let y=0;y<h;y++){const a=[];for(let j=0;j<21;j++)a.push(brightness(Math.min(w-1,Math.floor(w*(.28+j*.44/20))),y));yp[y]=median(a);}
 function boundary(profile,lo,hi,direction,fallback){
   const n=profile.length,band=Math.max(2,Math.round(n*.012)),start=Math.max(band,Math.floor(n*lo)),stop=Math.min(n-band-1,Math.floor(n*hi));
   // Small moving average reduces false positives from image texture.
   const radius=Math.max(1,Math.round(n*.003)),smooth=new Float32Array(n),prefix=new Float64Array(n+1);
   for(let i=0;i<n;i++)prefix[i+1]=prefix[i]+profile[i];
   for(let i=0;i<n;i++)smooth[i]=(prefix[Math.min(n,i+radius+1)]-prefix[Math.max(0,i-radius)])/(Math.min(n,i+radius+1)-Math.max(0,i-radius));
   const sums=new Float64Array(n+1);for(let i=0;i<n;i++)sums[i+1]=sums[i]+smooth[i];
   let best=-Infinity,idx=-1;
   for(let i=start;i<=stop;i++){const before=(sums[i]-sums[i-band])/band,after=(sums[i+band]-sums[i])/band,score=direction*(before-after);if(score>best){best=score;idx=i;}}
   return best<9?fallback:idx/n;
 }
 let l=boundary(xp,.025,.19,1,.055),r=boundary(xp,.81,.975,-1,.945),t=boundary(yp,.025,.20,1,.075),b=boundary(yp,.73,.95,-1,.865);
 if(r-l<.55||b-t<.50){[l,r,t,b]=[.055,.945,.075,.865];}
 state.bounds=[l+.005,r-.005,t+.005,b-.005];schedule();
}
$('detect').addEventListener('click',autoDetect);
let lastLayout=null;
function draw(){
 const c=state.frame;const [ow,oh]=sizes[$('ratio').value];$('dimensions').textContent=`${ow} × ${oh}`;
 if(!c){clearPreviews();return;}
 source.style.visibility='visible';
 result.style.visibility='visible';
 const css=source.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);
 source.width=Math.max(1,Math.round(css.width*dpr));source.height=Math.max(1,Math.round(css.height*dpr));
 const sc=source.getContext('2d'),fit=fitRect(c.width,c.height,source.width-20*dpr,source.height-20*dpr);fit.x+=10*dpr;fit.y+=10*dpr;
 sc.clearRect(0,0,source.width,source.height);sc.drawImage(c,fit.x,fit.y,fit.w,fit.h);
 const [l,r,t,b]=state.bounds;
 sc.strokeStyle='#36ed72';sc.lineWidth=2.5*dpr;sc.strokeRect(fit.x+l*fit.w,fit.y+t*fit.h,(r-l)*fit.w,(b-t)*fit.h);
 for(const [x,y] of [[l,t],[r,t],[l,b],[r,b]]){sc.beginPath();sc.arc(fit.x+x*fit.w,fit.y+y*fit.h,6*dpr,0,Math.PI*2);sc.fillStyle='#7cff9b';sc.fill();sc.strokeStyle='#121212';sc.stroke();}
 lastLayout={fit,dpr};
 // Render preview at reduced resolution for responsive mobile sliders.
 const previewScale=Math.min(1,720/Math.max(ow,oh));
 const pw=Math.round(ow*previewScale),ph=Math.round(oh*previewScale);
 drawComposite(result,pw,ph,previewScale);
}
function renderEmpty(canvas,label){const rect=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(rect.width));canvas.height=Math.max(1,Math.round(rect.height));const ctx=canvas.getContext('2d');ctx.fillStyle='#888';ctx.textAlign='center';ctx.font='14px sans-serif';ctx.fillText(label,canvas.width/2,canvas.height/2);}
// Seeded random generator ensures consistent preview and saved texture for the same seed.
function seeded(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function gaussian(random){return Math.sqrt(-2*Math.log(Math.max(1e-10,random())))*Math.cos(2*Math.PI*random());}
function makeTexture(ow,oh){
 const key=textureKey(ow,oh);
 if(textureCache.key===key && textureCache.canvas)return textureCache.canvas;
 const src=textureImages[$('textureKind').value];
 if(!src)throw new Error(t('textureNotReady'));
 const random=seeded(textureSeed), rotate=Math.floor(random()*4),flipped=random()>.5;
 const temp=makeCanvas(ow,oh),ctx=temp.getContext('2d',{willReadFrequently:true});
 // Repeatable 90-degree rotations and horizontal flip, like the Python generator.
 const turned=rotate%2===1,iw=turned?src.height:src.width,ih=turned?src.width:src.height;
 const zoom=(1.06+random()*.38)*Math.max(.5,v('textureScale')/100);
 const cover=Math.max(ow/iw,oh/ih)*Math.max(1,zoom),sw=Math.max(ow,Math.ceil(iw*cover)),sh=Math.max(oh,Math.ceil(ih*cover));
 const ox=Math.floor(random()*(sw-ow+1)),oy=Math.floor(random()*(sh-oh+1));
 ctx.save();ctx.translate(-ox+sw/2,-oy+sh/2);ctx.scale(flipped?-1:1,1);ctx.rotate(rotate*Math.PI/2);
 ctx.drawImage(src,-src.width*cover/2,-src.height*cover/2,src.width*cover,src.height*cover);ctx.restore();
 const data=ctx.getImageData(0,0,ow,oh),p=data.data;
 const luminance=new Float32Array(ow*oh);let sum=0;
 for(let i=0,j=0;i<p.length;i+=4,j++){const g=p[i]*.299+p[i+1]*.587+p[i+2]*.114;luminance[j]=g;sum+=g;}
 const meanGray=sum/luminance.length;
 const color=$('textureColor').value,base=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 const strength=v('textureStrength'),contrast=.65+strength/100*.75;
 const blurCanvas=makeCanvas(ow,oh),blurCtx=blurCanvas.getContext('2d',{willReadFrequently:true});
 // Gaussian-like low-frequency mean image. Canvas blur differs slightly from OpenCV GaussianBlur.
 const baseCanvas=makeCanvas(ow,oh),baseCtx=baseCanvas.getContext('2d');
 const colors=new ImageData(ow,oh);
 for(let j=0,i=0;j<luminance.length;j++,i+=4){const d=(luminance[j]-meanGray)*.8;for(let k=0;k<3;k++)colors.data[i+k]=clamp(base[k]+d,0,255);colors.data[i+3]=255;}
 baseCtx.putImageData(colors,0,0);
 blurCtx.filter=`blur(${Math.round(Math.max(ow,oh)*.12)}px)`;blurCtx.drawImage(baseCanvas,0,0);blurCtx.filter='none';
 const low=blurCtx.getImageData(0,0,ow,oh).data;
 const grain=seeded((textureSeed+1234)>>>0),out=ctx.createImageData(ow,oh);
 for(let i=0;i<p.length;i+=4){
   const noise=gaussian(grain)*2;
   for(let k=0;k<3;k++)out.data[i+k]=clamp(low[i+k]+(colors.data[i+k]-low[i+k])*contrast+noise,0,255);
   out.data[i+3]=255;
 }
 ctx.putImageData(out,0,0);
 textureCache={key,canvas:temp};return temp;
}
// Portable box blur: works even when CanvasRenderingContext2D.filter is unsupported.
function boxBlurRGB(data,w,h,radius){
 radius=Math.max(0,Math.round(radius));if(!radius)return;
 const src=new Uint8ClampedArray(data),mid=new Uint8ClampedArray(data.length);
 // Horizontal sliding window, clamped at the canvas boundary.
 for(let y=0;y<h;y++){
   const row=y*w*4, sums=[0,0,0], count=radius*2+1;
   for(let dx=-radius;dx<=radius;dx++){
     const x=clamp(dx,0,w-1),i=row+4*x;
     for(let k=0;k<3;k++)sums[k]+=src[i+k];
   }
   for(let x=0;x<w;x++){
     const i=row+4*x;
     for(let k=0;k<3;k++)mid[i+k]=sums[k]/count;
     mid[i+3]=255;
     const old=row+4*clamp(x-radius,0,w-1),next=row+4*clamp(x+radius+1,0,w-1);
     for(let k=0;k<3;k++)sums[k]+=src[next+k]-src[old+k];
   }
 }
 // Vertical sliding window.
 for(let x=0;x<w;x++){
   const sums=[0,0,0],count=radius*2+1;
   for(let dy=-radius;dy<=radius;dy++){
     const i=(clamp(dy,0,h-1)*w+x)*4;
     for(let k=0;k<3;k++)sums[k]+=mid[i+k];
   }
   for(let y=0;y<h;y++){
     const i=(y*w+x)*4;
     for(let k=0;k<3;k++)data[i+k]=sums[k]/count;
     data[i+3]=255;
     const old=(clamp(y-radius,0,h-1)*w+x)*4,next=(clamp(y+radius+1,0,h-1)*w+x)*4;
     for(let k=0;k<3;k++)sums[k]+=mid[next+k]-mid[old+k];
   }
 }
}
function adjustPhotoBackground(bg,blur,brightness){
 // Downsample large backgrounds for mobile performance, then scale back up.
 // Scale the blur radius with the downsample factor.
 const factor=Math.min(1,650/Math.max(bg.width,bg.height));
 const w=Math.max(1,Math.round(bg.width*factor)),h=Math.max(1,Math.round(bg.height*factor));
 const small=makeCanvas(w,h),sc=small.getContext('2d',{willReadFrequently:true});
 sc.drawImage(bg,0,0,w,h);
 const pixels=sc.getImageData(0,0,w,h);
 const radius=Math.round(blur*factor);
 if(radius>0)boxBlurRGB(pixels.data,w,h,radius);
 const light=brightness/100;
 if(light!==1){for(let i=0;i<pixels.data.length;i+=4){
   pixels.data[i]=pixels.data[i]*light;
   pixels.data[i+1]=pixels.data[i+1]*light;
   pixels.data[i+2]=pixels.data[i+2]*light;
 }}
 sc.putImageData(pixels,0,0);
 const ctx=bg.getContext('2d');ctx.clearRect(0,0,bg.width,bg.height);
 ctx.drawImage(small,0,0,bg.width,bg.height);
}
function drawComposite(target,ow,oh,previewScale){
 const frame=state.frame,[l,r,t,b]=state.bounds;
 const fx=Math.round(l*frame.width),fy=Math.round(t*frame.height),fw=Math.max(1,Math.round((r-l)*frame.width)),fh=Math.max(1,Math.round((b-t)*frame.height));
 let bg;
 if($('bgMode').value==='texture'){
   bg=makeTexture(ow,oh);
 }else{
   // Cover-fit blurred inner photograph as background.
   bg=makeCanvas(ow,oh);const bc=bg.getContext('2d');
   const zoom=v('zoom')/100,scale=Math.max(ow/fw,oh/fh)*zoom,bw=Math.ceil(fw*scale),bh=Math.ceil(fh*scale);
   const sx=Math.round((bw-ow)*(v('moveX')+100)/200),sy=Math.round((bh-oh)*(v('moveY')+100)/200);
   bc.drawImage(frame,fx,fy,fw,fh,-sx,-sy,bw,bh);
   adjustPhotoBackground(bg,v('blur')*previewScale,v('brightness'));
 }
 target.width=ow;target.height=oh;const ctx=target.getContext('2d');
 ctx.drawImage(bg,0,0);
 let tw=Math.round(ow*v('size')/100),th=Math.round(tw*frame.height/frame.width);
 if(th>oh*.96){th=Math.round(oh*.96);tw=Math.round(th*frame.width/frame.height);}
 ctx.drawImage(frame,Math.floor((ow-tw)/2),Math.floor((oh-th)/2),tw,th);
}
function loc(e){const box=source.getBoundingClientRect(),s=source.width/box.width;return {x:(e.clientX-box.left)*s,y:(e.clientY-box.top)*s};}
function findDrag(e){if(!state.frame||!lastLayout)return null;
 const {fit,dpr}=lastLayout,{x,y}=loc(e),[l,r,t,b]=state.bounds;
 const points={tl:[l,t],tr:[r,t],bl:[l,b],br:[r,b]};
 const d2=([a,b])=>Math.hypot(x-(fit.x+a*fit.w),y-(fit.y+b*fit.h));
 const nearest=Object.entries(points).sort((a,b)=>d2(a[1])-d2(b[1]))[0];
 if(d2(nearest[1])<28*dpr)return nearest[0];
 const lx=fit.x+l*fit.w,rx=fit.x+r*fit.w,ty=fit.y+t*fit.h,by=fit.y+b*fit.h;
 const edges={left:Math.abs(x-lx),right:Math.abs(x-rx),top:Math.abs(y-ty),bottom:Math.abs(y-by)};
 const picks=Object.entries(edges).filter(([key,d])=>d<25*dpr&&(key==='left'||key==='right'?y>=ty-20*dpr&&y<=by+20*dpr:x>=lx-20*dpr&&x<=rx+20*dpr)).sort((a,b)=>a[1]-b[1]);
 return picks[0]?.[0]||null;
}
source.addEventListener('pointerdown',e=>{const d=findDrag(e);if(d){state.drag=d;source.setPointerCapture(e.pointerId);e.preventDefault();}});
source.addEventListener('pointermove',e=>{if(!state.drag||!lastLayout)return;e.preventDefault();const {fit}=lastLayout,{x,y}=loc(e);const bx=clamp((x-fit.x)/fit.w,0,1),by=clamp((y-fit.y)/fit.h,0,1),b=state.bounds,d=state.drag,g=.03;
 if(['left','tl','bl'].includes(d))b[0]=Math.min(bx,b[1]-g);
 if(['right','tr','br'].includes(d))b[1]=Math.max(bx,b[0]+g);
 if(['top','tl','tr'].includes(d))b[2]=Math.min(by,b[3]-g);
 if(['bottom','bl','br'].includes(d))b[3]=Math.max(by,b[2]+g);
 schedule();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])source.addEventListener(event,()=>state.drag=null);
$('save').addEventListener('click',()=>{
 if(!state.frame)return;
 try{const [w,h]=sizes[$('ratio').value],canvas=makeCanvas(w,h);drawComposite(canvas,w,h,1);canvas.toBlob(blob=>{if(!blob){notify('jpegError');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${state.fileName}_Instant_${$('ratio').value.replace(':','x')}.jpg`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('saveRequested');},'image/jpeg',.95);}catch(e){notify('saveErrorDetail',e.message);}
});
applyLanguage(currentLang);
updateMode();
window.addEventListener('resize',schedule);
if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
schedule();

// Mobile sticky result must sit immediately below the variable-height header.
const siteHeader=document.querySelector('header');
function syncHeaderHeight(){
  document.documentElement.style.setProperty('--Instant-header-height',`${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
}
syncHeaderHeight();
if('ResizeObserver' in window)new ResizeObserver(syncHeaderHeight).observe(siteHeader);
window.addEventListener('resize',syncHeaderHeight);
