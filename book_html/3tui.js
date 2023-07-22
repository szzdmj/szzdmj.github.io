var g_nTuiStyle = 1;	// 0: 复选型 1: 单选型(7个选择项) 2: 单选型(3个选择项)
var g_nTuiInit = 0;		// 复选型，打开三退对话框时的初始值，0 不选，4 退队，6 退团队，7 退党团队
var g_sTuiNote = "<font style='font-size:11pt' color=brown>注：入过什么退什么，入过党请选退党，入过团请选退团，入过队或小时候戴过红领巾请选退队。</font>";
var g_nAliasNum = 0;// 自定义化名数，可设 0-9，不为 0 时，每次从 g_sAlias 随机选择自定义数量的名字
// 自定义化名，按下面格式在方括号中添加
var g_sAlias = ["平安","幸福","吉祥","如意"];

var g_nTui, g_nTuiNum, g_sTuiData;

function goTui()
{
	var n = 0;
	if (chk0.checked) n = 1;
	if (chk1.checked) n += 2;
	if (chk2.checked) n += 4;
	if (n == 0) {alert("入过党请选退党\n入过团请选退团\n入过队或小时候戴过红领巾请选退队");return false;} else g_nTui = n;
	setTimeout("selAlias();", 1);
}

function goTui2(n)
{
	g_nTui = [7,6,4,3,5,1,2][n];
	setTimeout("selAlias();", 1);
}

function chkAlias(s)
{
	var n = s.length;
	if (n<2) {alert("化名至少 2 个字！");return false;}
	for (var i=n-1; i>=0; --i)
	{
		var c=s.charCodeAt(i);
		if (c < 19968 || c > 40869) {alert("化名必须都是汉字！");return false;}
	}
	if (g_nTuiNum > 0 && g_sTuiData.indexOf(s) >= 0) {alert("化名重复！");return false;}
	return true;
}

function getTuiType()
{
	var s = '退';
	if (g_nTui & 1) s += '党';
	if (g_nTui & 2) s += '团';
	if (g_nTui & 4) s += '队';	
	return s;
}

function submitTui(s)
{
	if (s == '输入名字') s = prompt("请输入化名或真名（至少 2 个字）", "");
	if (s == null) return; else s = s.replace(/\s/g,"");
	if (!chkAlias(s)) return;
	if (g_nTuiNum > 0)
	{
		if (g_sTuiData != "") g_sTuiData += ";";
		g_sTuiData += s+","+getTuiType();
		var t = "<font color=green><b>" + g_sTuiData.replace(/;/g,"<br>") + "</b></font>"
		easyDialog.open({container:{header:"已添加 "+g_nTuiNum+" 人", content:t, yesText:"提交三退", noText:"继续添加", yesFn:submitTui2, noFn:doTui2}});
		g_nTuiNum++;
		return;
	}
	easyDialog.close();
	sendTui(s+','+getTuiType());
}

function submitTui2()
{
	easyDialog.close();
	sendTui(g_sTuiData);
}

function sendTui(s)
{
	var t = encodeURIComponent(s);
	var f = "3tuiok.html?data="+t+"&v="+djb(t);
	if (!window.XMLHttpRequest) {window.location.href = f;return;}
	var xhr = new XMLHttpRequest();
    xhr.open("GET", f, true);
    xhr.setRequestHeader('If-Modified-Since', '0');
	xhr.setRequestHeader("Cache-Control","no-cache");
    xhr.timeout = 3500;
	var bFail = false;
	xhr.onerror = function () {if (!bFail) {bFail = true;alert("提交出错！");}}
    xhr.onreadystatechange=function ()
    {
    	if (xhr.readyState != 4) return;
    	if (xhr.status == 200)
    	{
			s = "<b><font color=blue>谢谢！我们将复查您提交的三退数据，并帮您在海外大纪元网站登记有效的三退，请您记住今天的日期。</font><br><br><font color=green>" + s.replace(/;/g, '<br>') + "</font><br><br>";
			if (typeof(g_sFile) != "undefined" && g_sFile != "")
			{
				s += "请点击下载以下文件，了解更多真相：<br><a href='media/"+g_sFile+"' onclick='easyDialog.close();' "+getDL(g_sFile)+">"+g_sFile+"</a>";
			} else
				s += "请继续浏览本站内容。";
			s += "</b><br><br><img src='images/tuidang.png'>";
			easyDialog.open({container:{header:"三退成功！", content:s, noText:"关闭", noFn:true}});
        } else
        	if (!bFail) {bFail = true;alert("提交失败！");}
    }
    xhr.send();
}

function sendMsg(s)
{
	s = s.replace(/\r/g, "").replace(/\n/g, " ");
	var t = encodeURIComponent(s);
	var f = "msgok.html?data="+t+"&v="+djb(t);
	if (!window.XMLHttpRequest) {window.location.href = f;return;}
	var xhr = new XMLHttpRequest();
    xhr.open("GET", f, true);
    xhr.timeout = 3500;
	var bFail = false;
	xhr.onerror = function () {if (!bFail) {bFail = true;alert("提交出错！");}}
    xhr.onreadystatechange=function ()
    {
    	if (xhr.readyState != 4) return;
    	if (xhr.status == 200)
    	{
			s = "<b><font color=blue>谢谢您的反馈！</font><br><br><font color=green>" + s + "</font><br><br>请继续浏览本站内容。</b><br><br>";
			easyDialog.open({container:{header:"提示", content:s, noText:"关闭", noFn:true}});
        } else
        	if (!bFail) {bFail = true;alert("提交失败！");}
    }
    xhr.send();
}

function stopPropagation(e)
{
	e = window.event || e;
	if (document.all) e.cancelBubble=true; else e.stopPropagation();
}

function initTui(nTuiNum)
{
	g_nTuiNum = nTuiNum;
	g_sTuiData = "";	
}

function doTui(n) {initTui(0);doTui0(n);}
function doTui1() {initTui(1);doTui0();}
function doTui2() {setTimeout("doTui0();", 1);}
function popTui() {setTimeout("doTui();", 1);}

function doTui0(n)
{
	var t = "请选择退出类型"+(g_nTuiNum>1 ? " (第"+g_nTuiNum+"人)" : "");
	if (g_nTuiStyle == 0)
	{
		if (n === undefined || n < 0 || n > 7) n = g_nTuiInit;
		var s = "", arr = ["退党","退团","退队"];
		for (var i=0; i<3; ++i) s += '<div class=menuitem onclick="chk'+i+'.checked=!chk'+i+'.checked;"><input class=chk id=chk'+i+' type=checkbox '+(n & (1<<i) ? 'checked' : '')+' onclick="stopPropagation(event);"> '+arr[i]+'</div>';
		s += g_sTuiNote;
		easyDialog.open({container:{header:t, content:s, yesFn:goTui, noFn:true}});
		return;
	}
	var s = "", arr = g_nTuiStyle==1 ? ["退党团队","退团队","退队","退党团","退党队","退党","退团"] : ["退党团队","退团队","退队"];
	n = arr.length;
	for (var i=0; i<n; ++i) s += '<div class=menuitem onclick="goTui2('+i+');" onmouseover="style.background=\'#d6ddf2\';" onmouseout="style.background=\'white\';">'+arr[i]+'</div>';
	if (g_nTuiStyle < 2) s += g_sTuiNote;
	easyDialog.open({container:{header:t, content:s}});
}

function shuffle(m)
{
	var n = g_sAlias.length;
	var a = new Array(n);
	var r = new Array(m);
	for (var i=0; i<m; ++i)
	{
		var k = n-i;
		var j = Math.floor(Math.random() * k);
		r[i] = a[j]?a[j]:j;
		a[j] = a[--k]?a[k]:k;
	}
	return r;
}

function selAlias()
{
	var s = "";
	var k = Math.min(g_nAliasNum, g_sAlias.length);
	var r = k > 0 ? shuffle(k) : [];
	for (var i=0; i<10; ++i)
	{
		var t = i < k ? g_sAlias[r[i]] : i < 9 ? getAlias() : "输入名字";
		s += '<div class=menuitem onclick="submitTui(\''+t+'\');" onmouseover="style.background=\'#d6ddf2\';" onmouseout="style.background=\'white\';">'+t+'</div>';
	}
	easyDialog.open({container:{header:"请选择化名"+getTuiType(), content:s}});
}

function djb(s)
{
	var n = 5381;
	for (var i=s.length-1; i>=0; --i) {n += (n << 5) + s.charCodeAt(i);if (n > 0xffffff) n &= 0xffffff;}
	return n;
}

var NAME1 = "超开润前庆达昌发东辉保伟才兴国广力永承成绍源宇英茂林中岩卓航宽华义波培向越贵福元哲浩全奇文明良海山仁新彬富顺信子杰涛康正学祥安天星宝田有和博诚先敬亮会群心道乐善民友裕河松言若鸣朋斌之翰维翔晨辰雨金益轩迪实舟洲川昆来坤通礼吉洋书多百传万丰德家伦旭启以时泰盛立智千汉同石森劲景平忆毅世士原得添增自科品修亭庭廷扬名其齐缘显由里理迅晋榕叙泉知临合常长恩定研升申跃涵倍备卫运近岳效容从忠高方怀连联谦优位桥复颂含帆";
var NAME2 = "秀惠巧慧玉雅洁云真彩雪梅荣环瑞凡月佳嘉勤桂叶敏秋锦瑶怡颖仪荷丹君岚馨韵融园艺咏卿聪澜纯悦羽宁欣竹蕴晓芸伊亚妙紫可诗佩依彤亦予如宜舒圆冬畅端典初笛贝允采朵慈喜贤双语加蓝好甜霄";
var LEN_NAME31 = 201;
var LEN_NAME32 = 86;
var LEN_NAME3 = LEN_NAME31 + LEN_NAME32;

var m_sBlock, m_chBlock, m_nBlock = [];

function loadBlock()
{
var BLOCK = [
"安卓",
"百显",
"宝保贝",
"保安百宝贝好合洁先研正",
"贝景信运",
"备景信运",
"倍景信运",
"博采彩其奇启士",
"才礼",
"采丹道礼友",
"彩礼民信友",
"长鸣真",
"常鸣显真",
"畅昌",
"超平森申升书",
"辰仁毅",
"晨博仁毅",
"成仁毅",
"承仁毅",
"诚仁毅",
"初彬斌诗玉",
"川传",
"传迅言岩研",
"纯勤",
"慈",
"从来良",
"聪",
"达",
"丹道田优",
"道采廷亭庭",
"得道国",
"德国怀",
"迪笛君",
"笛迪君",
"典朵",
"定勤卿",
"东朵森",
"冬",
"端得来",
"多端勤显雪雨语",
"朵典端多",
"恩安来",
"帆添修",
"凡",
"方",
"丰波仁",
"福",
"复合连联学原",
"富洁连联",
"高德典",
"广",
"贵安桂",
"桂安贵园圆之",
"国安保君庆",
"海",
"含效信正",
"涵效信正",
"汉翰语",
"翰",
"航",
"好高宽奇显",
"浩",
"合申",
"和申",
"河宝保贝道得多名申中竹",
"荷申",
"华朵",
"怀运韵蕴",
"环",
"辉典",
"会培星",
"惠培星",
"慧培星",
"吉",
"加平",
"佳平",
"家传平",
"嘉平",
"杰伦",
"洁石",
"金",
"锦笛礼涛卫中忠",
"劲添忠",
"近添忠",
"晋添忠",
"景笛礼涛卫中忠",
"敬礼添忠",
"君迅",
"开来廷亭庭",
"康",
"科连联",
"可乐连联",
"宽伊依",
"坤",
"昆",
"来丰岚蓝澜",
"岚来伦",
"蓝来伦",
"澜来伦",
"乐",
"礼",
"理发由",
"力",
"立",
"连敏",
"联敏",
"良加家民",
"亮",
"林信忠中",
"临信忠中",
"伦语",
"茂浩名",
"妙玉",
"民运",
"敏",
"名",
"明",
"鸣",
"宁",
"培礼同",
"佩",
"朋友",
"品",
"平常凡民名明",
"齐",
"其",
"奇",
"启",
"千金连联",
"谦科连联",
"前科千谦",
"桥保瑶",
"巧合",
"勤迪发盛书舒裕",
"卿高家洁金廷亭庭",
"庆林",
"秋保波开千雪颖之",
"全家培",
"泉培",
"群",
"仁伦",
"荣",
"容",
"榕",
"融",
"如来",
"瑞",
"润之",
"若德智",
"山田",
"善中忠",
"绍",
"申明森添",
"升森添学",
"盛传",
"石才言忆",
"时千",
"实",
"士端仁",
"世端仁",
"书",
"舒",
"双开诗书修",
"顺民",
"松劲开田叶中忠",
"颂仁修中忠",
"泰宝保贝备倍国君语",
"涛",
"天道君开庭修真",
"添加真",
"田中",
"甜言",
"廷发开新馨运",
"亭发开新馨运",
"庭发开新馨运",
"通勤容榕融知",
"同通修学",
"彤通修学",
"万",
"维",
"伟贝备倍君培善",
"卫金",
"位金",
"文",
"喜伊依亦裕",
"先仁申升诗知",
"贤帆凡仁诗言",
"显百",
"祥",
"翔",
"向洋",
"霄晓",
"晓道平仁",
"效仁益忠",
"心多凡丰含",
"欣丰",
"新丰",
"馨丰",
"信丰涵",
"兴丰",
"星丰",
"修道复桥",
"秀才",
"旭",
"叙",
"轩",
"学",
"雪雨",
"迅道国",
"雅",
"亚",
"言安朵甜岩",
"岩安",
"研安",
"扬言",
"洋言",
"瑶传言岩研",
"叶平霄英由玉裕",
"伊",
"依保端",
"仪传荣容榕融书迅言",
"宜传荣容榕融书迅言",
"怡传荣容榕融书迅言",
"以",
"义端卫",
"忆端卫",
"艺端名卫语",
"亦端卫",
"益端卫",
"毅端卫",
"英纯金森申升添显",
"颖超言",
"永辉康",
"咏康",
"优国民",
"由田",
"友彬斌喜",
"有彬斌喜",
"予",
"宇",
"羽",
"雨雪依",
"语多",
"玉",
"裕依",
"元宝吉霄",
"园景圆",
"原",
"圆",
"缘",
"源",
"月玉",
"岳飞玉",
"悦玉",
"跃玉",
"越玉",
"云山雨",
"芸雨",
"允",
"运道中忠",
"韵怀",
"蕴",
"增加",
"哲",
"真多",
"正常",
"知卿",
"智立若",
"中采彩东丰学元越正",
"忠",
"舟",
"洲",
"竹林叶",
"卓",
"子多",
"紫",
"自复劲近晋卫位"
];
	var n = BLOCK.length, sb = '', ch = [];
	for (var i=0; i<n; ++i)
	{
		var s = BLOCK[i];
		ch[i] = s.charAt(0);
		if (s.length > 1) sb += s.substring(1);
		m_nBlock[i+1] = sb.length;
	}
	m_sBlock = ch.join('');
	m_chBlock = sb.split('');
}
loadBlock();

function getAlias()
{
  	var i, j, c, c1=0, c2=0;
	while (c1 == 0)
	{
		j = nextInt(LEN_NAME3);
		c = getChar2(j);
		if (c2 == 0)
		{
			if ("紫子自若品效佩士世育前理位心以汉天从长右向".indexOf(c) < 0) c2 = c;
			continue;
		} else
			if (c != c2 && "昌诗波之斌彬梅森发".indexOf(c) < 0) c1 = c; else continue;
		i = m_sBlock.indexOf(c1);
		if (i < 0) break;
		j = m_nBlock[i+1];
		for (i=m_nBlock[i]; i<j; ++i) if (m_chBlock[i] == c2) {c1 = 0;break;}
	}
	return c1 + c2;
}

function getChar2(j) {return j < LEN_NAME31 ? NAME1.charAt(j) : NAME2.charAt(j - LEN_NAME31);}
function nextInt(n) {return Math.floor(Math.random()*n);}

function toast(s, t)
{
	if (typeof s == "undefined" || getCookie("toast")) return;
	Toastify({text:s,duration:t,newWindow:true,stopOnFocus:true,close:true}).showToast();
	setCookie("toast");
}

// easyDialog
(function(o,v){var g=o.document,q=g.documentElement,J=function(){var p=g.body,w=!-[1,],r=w&&/msie 6/.test(navigator.userAgent.toLowerCase()),I=1,y="cache"+(+new Date+"").slice(-8),u={},d=function(){};d.prototype={getOptions:function(a){var b,c={},e={container:null,overlay:true,drag:false,fixed:true,follow:null,followX:0,followY:0,autoClose:0,lock:false,callback:null};for(b in e)c[b]=a[b]!==v?a[b]:e[b];d.data("options",c);return c},setBodyBg:function(){if(p.currentStyle.backgroundAttachment!=="fixed"){p.style.backgroundImage=
"url(about:blank)";p.style.backgroundAttachment="fixed"}},appendIframe:function(a){a.innerHTML='<iframe style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;border:0 none;filter:alpha(opacity=0)"></iframe>'},setFollow:function(a,b,c,e){b=typeof b==="string"?g.getElementById(b):b;a=a.style;a.position="absolute";a.left=d.getOffset(b,"left")+c+"px";a.top=d.getOffset(b,"top")+e+"px"},setPosition:function(a,b){var c=a.style;c.position=r?"absolute":b?"fixed":"absolute";if(b){if(r)c.setExpression("top",
'IE6=document.documentElement.scrollTop+document.documentElement.clientHeight/2+"px"');else c.top="50%";c.left="50%"}else{r&&c.removeExpression("top");c.top=q.clientHeight/2+d.getScroll("top")+"px";c.left=q.clientWidth/2+d.getScroll("left")+"px"}},createOverlay:function(){var a=g.createElement("div"),b=a.style;b.cssText="margin:0;padding:0;border:none;width:100%;height:100%;background:#333;opacity:0.6;filter:alpha(opacity=60);z-index:9999;position:fixed;top:0;left:0;";if(r){p.style.height="100%";
b.position="absolute";b.setExpression("top",'IE6=document.documentElement.scrollTop+"px"')}a.id="overlay";return a},createDialogBox:function(){var a=g.createElement("div");a.style.cssText="margin:0;padding:0;border:none;z-index:10000;";a.id="easyDialogBox";return a},createDialogWrap:function(a){var b=typeof a.yesFn==="function"?'<button class="btn_highlight" id="easyDialogYesBtn">'+(typeof a.yesText==="string"?a.yesText:"\u786e\u5b9a")+"</button>":"",c=typeof a.noFn==="function"||a.noFn===true?
'<button class="btn_normal" id="easyDialogNoBtn">'+(typeof a.noText==="string"?a.noText:"\u53d6\u6d88")+"</button>":"";a=['<div class="easyDialog_content">',a.header?'<div class="easyDialog_title" id="easyDialogTitle"><span title="\u5173\u95ed" class="close_btn" id="closeBtn">&times;</span>'+a.header+"</div>":"",'<div class="easyDialog_text">'+a.content+"</div>",b===""&&c===""?"":'<div class="easyDialog_footer">'+c+b+"</div>","</div>"].join("");b=g.getElementById("easyDialogWrapper");
if(!b){b=g.createElement("div");b.id="easyDialogWrapper";b.className="edw"}b.innerHTML=a.replace(/<[\/]*script[\s\S]*?>/ig,"");return b}};d.data=function(a,b,c){if(typeof a==="string"){if(b!==v)u[a]=b;return u[a]}else if(typeof a==="object"){a=a===o?0:a.nodeType===9?1:a[y]?a[y]:a[y]=++I;a=u[a]?u[a]:u[a]={};if(c!==v)a[b]=c;return a[b]}};d.removeData=function(a,b){if(typeof a==="string")delete u[a];else if(typeof a==="object"){var c=a===o?0:a.nodeType===9?1:a[y];if(c!==v){var e=function(m){for(var n in m)return false;
return true},f=function(){delete u[c];if(!(c<=1))try{delete a[y]}catch(m){a.removeAttribute(y)}};if(b){delete u[c][b];e(u[c])&&f()}else f()}}};d.event={bind:function(a,b,c){var e=d.data(a,"e"+b)||d.data(a,"e"+b,[]);e.push(c);if(e.length===1){c=this.eventHandler(a);d.data(a,b+"Handler",c);if(a.addEventListener)a.addEventListener(b,c,false);else a.attachEvent&&a.attachEvent("on"+b,c)}},unbind:function(a,b,c){var e=d.data(a,"e"+b);if(e){if(c)for(var f=e.length-1,m=e[f];f>=0;f--)m===c&&e.splice(f,1);
else e=v;if(!e||!e.length){c=d.data(a,b+"Handler");if(a.addEventListener)a.removeEventListener(b,c,false);else a.attachEvent&&a.detachEvent("on"+b,c);d.removeData(a,b+"Handler");d.removeData(a,"e"+b)}}},eventHandler:function(a){return function(b){b=d.event.fixEvent(b||o.event);for(var c=d.data(a,"e"+b.type),e=0,f;f=c[e++];)if(f.call(a,b)===false){b.preventDefault();b.stopPropagation()}}},fixEvent:function(a){if(a.target)return a;var b={},c;b.target=a.srcElement||document;b.preventDefault=function(){a.returnValue=
false};b.stopPropagation=function(){a.cancelBubble=true};for(c in a)b[c]=a[c];return b}};d.capitalize=function(a){var b=a.charAt(0);return b.toUpperCase()+a.replace(b,"")};d.getScroll=function(a){a=this.capitalize(a);return q["scroll"+a]||p["scroll"+a]};d.getOffset=function(a,b){var c=this.capitalize(b);c=q["client"+c]||p["client"+c]||0;var e=this.getScroll(b),f=a.getBoundingClientRect();return Math.round(f[b])+e-c};var x,G=function(a){a.keyCode===27&&D.close()},D={open:function(a){var b=new d,c=b.getOptions(a||{});a=d.event;var e=q.clientWidth,f=q.clientHeight,m=this,n,h,j,l;if(x){clearTimeout(x);x=v}if(c.overlay){n=g.getElementById("overlay");if(!n){n=b.createOverlay();p.appendChild(n);r&&b.appendIframe(n)}n.style.display="block"}r&&b.setBodyBg();h=g.getElementById("easyDialogBox");
if(!h){h=b.createDialogBox();p.appendChild(h)}if(c.follow){l=function(){b.setFollow(h,c.follow,c.followX,c.followY)};l();a.bind(o,"resize",l);d.data("follow",l);if(n)n.style.display="none";c.fixed=false}else b.setPosition(h,c.fixed);h.style.display="block";j=typeof c.container==="string"?g.getElementById(c.container):b.createDialogWrap(c.container);if(l=h.getElementsByTagName("*")[0]){if(l&&j!==l){l.style.display="none";p.appendChild(l);h.appendChild(j)}}else h.appendChild(j);j.style.display="block";
var t=j.offsetWidth,i=j.offsetHeight;l=t>e;var k=i>f;j.style.marginTop=j.style.marginRight=j.style.marginBottom=j.style.marginLeft="0px";if(c.follow)h.style.marginLeft=h.style.marginTop="0px";else{h.style.marginLeft="-"+(l?e/2:t/2)+"px";h.style.marginTop="-"+(k?f/2:i/2)+"px"}if(r&&!c.overlay){h.style.width=t+"px";h.style.height=i+"px"}e=g.getElementById("closeBtn");f=g.getElementById("easyDialogTitle");j=g.getElementById("easyDialogYesBtn");t=g.getElementById("easyDialogNoBtn");j&&a.bind(j,"click",
function(s){c.container.yesFn.call(m,s)!==false&&m.close()});if(t){i=function(s){if(c.container.noFn===true||c.container.noFn.call(m,s)!==false)m.close()};a.bind(t,"click",i);e&&a.bind(e,"click",m.close)}else e&&a.bind(e,"click",m.close);c.lock||a.bind(g,"keyup",G);if(c.autoClose&&typeof c.autoClose==="number")x=setTimeout(m.close,c.autoClose);if(c.drag&&f&&!l&&!k){f.style.cursor="move";d.drag(f,h)}if(!c.follow&&!c.fixed){i=function(){b.setPosition(h,false)};!l&&!k&&a.bind(o,"resize",i);d.data("resize",
i)}d.data("dialogElements",{overlay:n,dialogBox:h,closeBtn:e,dialogTitle:f,dialogYesBtn:j,dialogNoBtn:t})},close:function(){var a=d.data("options"),b=d.data("dialogElements"),c=d.event;if(x){clearTimeout(x);x=v}if(a.overlay&&b.overlay)b.overlay.style.display="none";b.dialogBox.style.display="none";r&&b.dialogBox.style.removeExpression("top");b.closeBtn&&c.unbind(b.closeBtn,"click");b.dialogTitle&&c.unbind(b.dialogTitle,"mousedown");b.dialogYesBtn&&c.unbind(b.dialogYesBtn,"click");b.dialogNoBtn&&c.unbind(b.dialogNoBtn,
"click");if(!a.follow&&!a.fixed){c.unbind(o,"resize",d.data("resize"));d.removeData("resize")}if(a.follow){c.unbind(o,"resize",d.data("follow"));d.removeData("follow")}a.lock||c.unbind(g,"keyup",G);typeof a.callback==="function"&&a.callback.call(D);d.removeData("options");d.removeData("dialogElements")}};return D},A=function(){o.easyDialog=J()},H=function(){if(!g.body){try{q.doScroll("left")}catch(p){setTimeout(H,1);return}A()}};(function(){if(g.body)A();else if(g.addEventListener){g.addEventListener("DOMContentLoaded",
function(){g.removeEventListener("DOMContentLoaded",arguments.callee,false);A()},false);o.addEventListener("load",A,false)}else if(g.attachEvent){g.attachEvent("onreadystatechange",function(){if(g.readyState==="complete"){g.detachEvent("onreadystatechange",arguments.callee);A()}});o.attachEvent("onload",A);var p=false;try{p=o.frameElement==null}catch(w){}q.doScroll&&p&&H()}})()})(window,undefined);
// toast
(function(n,t){typeof module=="object"&&module.exports?module.exports=t():n.Toastify=t()})(this,function(){var n=function(t){return new n.lib.init(t)};return n.lib=n.prototype={toastify:"1.7.0",constructor:n,init:function(n){return n||(n={}),this.options={},this.toastElement=null,this.options.text=n.text,this.options.duration=n.duration===0?0:n.duration||3e3,this.options.selector=n.selector,this.options.callback=n.callback||function(){},this.options.newWindow=n.newWindow||!1,this.options.close=n.close||!1,this.options.backgroundColor=n.backgroundColor,this.options.className=n.className||"",this.options.stopOnFocus=n.stopOnFocus===undefined?!0:n.stopOnFocus,this},buildToast:function(){var n,t,i;if(!this.options)throw"";if(n=document.createElement("div"),n.className="toastify on toastify-center "+this.options.className,this.options.backgroundColor&&(n.style.background=this.options.backgroundColor),n.innerHTML=this.options.text,this.options.close===!0&&(t=document.createElement("div"),t.innerHTML="&#10006;",t.className="toast-close",t.addEventListener("click",function(n){n.stopPropagation();this.removeElement(this.toastElement);window.clearTimeout(this.toastElement.timeOutValue)}.bind(this)),i=window.innerWidth>0?window.innerWidth:screen.width,n.insertAdjacentElement("afterbegin",t)),this.options.stopOnFocus&&this.options.duration>0){const t=this;n.addEventListener("mouseover",function(){window.clearTimeout(n.timeOutValue)});n.addEventListener("mouseleave",function(){n.timeOutValue=window.setTimeout(function(){t.removeElement(n)},t.options.duration)})}return n},showToast:function(){this.toastElement=this.buildToast();var n;if(n=typeof this.options.selector=="undefined"?document.body:document.getElementById(this.options.selector),!n)throw"Root element is not defined";return n.insertBefore(this.toastElement,n.firstChild),this.options.duration>0&&(this.toastElement.timeOutValue=window.setTimeout(function(){this.removeElement(this.toastElement)}.bind(this),this.options.duration)),this},removeElement:function(n){n.className=n.className.replace(" on","");window.setTimeout(function(){n.parentNode&&n.parentNode.removeChild(n);this.options.callback.call(n)}.bind(this),400)}},n.lib.init.prototype=n.lib,n})
