// 预取（预先下载文件）总开关
var g_bPF = 1;
// 修改下载的文件名和说明，每个文件一行。file 为源文件名，zw 为中文文件名（可省略），title 为文件说明，pf 为预取。相关文件都放在 media 目录
var g_aList1 = [
	{type:"软件"},
	{file:"lithium.apk",zw:"锂 EPUB 阅读器 - 安卓版.apk",title:"阅读软件：锂 EPUB 阅读器安卓版，可看 EPUB 格式电子书"},
	{type:"电子书"},
	{file:"9ping.html",zw:"九评共产党.html",title:"《九评共产党》HTML 格式",pf:1},
	{file:"zjmd.html",zw:"共产主义的终极目的.html",title:"《共产主义的终极目的》HTML 格式",pf:1},
	{file:"jtdwh.html",zw:"解体党文化.html",title:"《解体党文化》HTML 格式"},
	{file:"fytdx.html",zw:"风雨天地行.html",title:"《风雨天地行》HTML 格式"},
	{file:"jzmqr.html",zw:"江泽民其人.html",title:"《江泽民其人》HTML 格式"},
	{file:"murder.html",zw:"“死刑犯”撑不起中国器官移植市场上的蘑菇云.html",title:"《“死刑犯”撑不起中国器官移植市场上的蘑菇云》HTML 格式"},
	{file:"pj.html",zw:"世纪伪案惊天骗局.html",title:"《世纪伪案 惊天骗局》HTML 格式"},
	{file:"tdsc.html",zw:"退党手册.html",title:"《退党手册》HTML 格式"},
	{file:"huace.html",zw:"你我有缘.html",title:"《你我有缘》HTML 格式"},	
	{file:"mksdcmzl.epub",zw:"马克思的成魔之路.epub",title:"《马克思的成魔之路》EPUB 格式"},	
	{file:"jkemdms.epub",zw:"揭开恶魔的面纱.epub",title:"《揭开恶魔的面纱》EPUB 格式"},	
];

// 修改图片的文件名和说明，每行可多个文件（用英文逗号分隔）
var g_aList2 = [
	{file:"jbzxxl1.jpg,jbzxxl2.jpg,jbzxxl3.jpg,jbzxxl4.jpg,jbzxxl5.jpg",title:"基本真相",pf:1},
	{file:"fldfhcsj1.jpg,fldfhcsj2.jpg,fldfhcsj3.jpg,fldfhcsj4.jpg,fldfhcsj5.jpg,fldfhcsj6.jpg",title:"法轮大法弘传世界"},
	{file:"czsjm1.jpg,czsjm2.jpg,czsjm3.jpg",title:"藏字石揭秘",pf:1},
	{file:"zcswwq1.jpg,zcswwq2.jpg",title:"走出思维误区"},
	{file:"ysnbjhp1.jpg,ysnbjhp2.jpg,ysnbjhp3.jpg,ysnbjhp4.jpg,ysnbjhp5.jpg,ysnbjhp6.jpg,ysnbjhp7.jpg,ysnbjhp8.jpg,ysnbjhp9.jpg",title:"一生能被几回骗"},
	{file:"wsmqntd1.jpg,wsmqntd2.jpg",title:"为什么劝你退党"},
	{file:"nbdsfgls1.jpg,nbdsfgls2.jpg",title:"您把毒誓发给了谁"},
	{file:"bjmh15.jpg",title:"宝镜漫画"},
];

// 修改视频的文件名，中文文件名（可省略）和说明，每个文件一行。要不使用一行，可在行首加 //
var g_aList3 = [
	{file:"mhsf-trailer-1400_720-final.mp4",zw:"明慧十方1分钟：被重复了千遍的“1400例”.mp4",title:"明慧十方1分钟：被重复了千遍的“1400例”"},
	{file:"mhsf-trailer-fldf-hcsj_720-final.mp4",zw:"明慧十方1分钟：法轮大法洪传世界.mp4",title:"明慧十方1分钟：法轮大法洪传世界"},
	{file:"mhsf-trailer-is-expose-persecution-political_720-final.mp4",zw:"明慧十方1分钟：法轮功反迫害是搞政治吗.mp4",title:"明慧十方1分钟：法轮功反迫害是搞政治吗？"},	
	{file:"stjy-360p.mp4",zw:"美禁止党员移民　主动三退可解忧.mp4",title:"美禁止党员移民　主动三退可解忧"},
	{file:"guanguimin.mp4",zw:"歌唱家关贵敏的人生奇迹.mp4",title:"歌唱家关贵敏的人生奇迹"},
	{file:"huangxiaomin.mp4",zw:"奥运泳坛明星黄晓敏经历的人生巨变.mp4",title:"奥运泳坛明星黄晓敏经历的人生巨变"},
	{file:"bjfyj425.mp4",zw:"四二五上访真相.mp4",title:"“四·二五”上访真相"},
	{file:"tmzg.mp4",zw:"天灭中共.mp4",title:"天灭中共（2亿）"},
	{file:"weihuo.mp4",zw:"伪火 - 天安门自焚事件真相.mp4",title:"伪火:“天安门自焚”真相"},
	{file:"seynj_384_0632_32k.mp3",zw:"认真阅读《为什么会有人类》亲人得福报.mp3",title:"认真阅读《为什么会有人类》亲人得福报（音频）"},
	{file:"tyjy_434_20201108_1600-r.mp3",zw:"天机：找到真相 幸福就离你不远.mp3",title:"天机：找到真相 幸福就离你不远（音频）"},	{file:"hzxc.mp3",zw:"活摘现场持枪警卫证词.mp3",title:"活摘现场持枪警卫证词（音频）"},
	{file:"bxls.mp3",zw:"薄熙来说：江主席下的命令.mp3",title:"薄熙来说：江主席下的命令（音频）"},
	{file:"lccs.mp3",zw:"李长春说：周永康具体管这个事.mp3",title:"李长春说：周永康具体管这个事（音频）"},
	{file:"jzzjfy.mp3",zw:"锦州中级法院刑一厅警察说.mp3",title:"锦州中级法院刑一厅警察说（音频）"},
];

var relList=document.createElement('link').relList,g_bCanPF=relList&&relList.supports?relList.supports("prefetch"):false;if (!g_bCanPF) g_bPF=0;
function addPF(s){var link=document.createElement("link");link.rel="prefetch";link.href=s;document.head.appendChild(link);}
