/*
* PDFCreator: profile setting:
* Save: <DateTime:yyyyMMddHHmmss>-<Counter>
* Auto-Save: E:\PDFs\
* Actions: D:\crx\pdfserver\socketutf8.exe 127.0.0.1 81 "<ClientComputer>" "<Title>" "<OutputFileNames>" "<JobID>"
* Forever:  forever start -o app-out.log -e app-err.log -l app-forever.log -a --minUptime 2000 --spinSleepTime 2000 -v app.js
* supervisor -i . -n success app.js
* ImageMagick with GhostScript and PrinterDriver with PaperSize defined 80x50mm
* convert -geometry 640x400 -density 203x203 -resample 203x203 -depth 8 -quality 100 abc2.pdf abc2.jpg
*
*/


var CLIENT_NAME = 'printer1';
var HTTP_PORT = 88;
var PDF_DIR = "E:\\PDFs\\";
var CLIENT_ORDER = 1;
var CONVERT_TIMEOUT = 60*1000;


var host = 'http://1111hui.com:88';
FILE_HOST = 'http://7xkeim.com1.z0.glb.clouddn.com/';
PDFCreatorPath = "C:\\Program Files\\PDFCreator\\PDFCreator.exe";
PDFReaderPath2 = "D:\\Program Files\\FoxitReader\\Foxit Reader.exe";
PDFReaderPath = "c:\\Program Files\\SumatraPDF\\SumatraPDF.exe";



var qiniu = require('qiniu');
var path = require('path');

var util = require('util');
var fs = require('fs');
var url = require('url');
var http = require('http');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var request = require('request');
var WebSocket = require('ws');

var TableParser = require( 'table-parser' );
var _= require('underscore');

var mkdirp = require('mkdirp');


var timeoutCheckProc;
var interCheckProc;

var log = require('tracer').console({
    transport : function(data) {
        console.log(data.output);
        fs.open('c:/log.txt', 'a', 0666, function(e, id) {
            fs.write(id, data.output+"\n", null, 'utf8', function() {
                fs.close(id, function() {
                });
            });
        });
    }
});


// qiniu.conf.ACCESS_KEY = '';
// qiniu.conf.SECRET_KEY = '';


var formatDate = function(format) {
	d = new Date();
    var yyyy = d.getFullYear().toString();
    format = format.replace(/yyyy/g, yyyy)
    var mm = (d.getMonth()+1).toString();
    format = format.replace(/mm/g, (mm[1]?mm:"0"+mm[0]));
    var dd  = d.getDate().toString();
    format = format.replace(/dd/g, (dd[1]?dd:"0"+dd[0]));
    var hh = d.getHours().toString();
    format = format.replace(/hh/g, (hh[1]?hh:"0"+hh[0]));
    var ii = d.getMinutes().toString();
    format = format.replace(/ii/g, (ii[1]?ii:"0"+ii[0]));
    var ss  = d.getSeconds().toString();
    format = format.replace(/ss/g, (ss[1]?ss:"0"+ss[0]));
    return format;
};


// if(process.argv.length<3) process.exit();
// var client = process.argv[2].replace(/\\/g,"").replace(/\//g,"");
// var title = process.argv[3];
// var file = process.argv[4];


function updateHostName () {

  // http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
  var os = require('os');
  var HOSTNAME = os.hostname();
  var ifaces = os.networkInterfaces();

  var IPS = [];

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }

      if (alias >= 1) {
        IPS.push({ifname:ifname, address:iface.address});
      } else {
        IPS.push({ifname:ifname, address:iface.address});
      }
    });
  });
  // remain only LAN IPS
  IPS = IPS.filter(function(v){ return v.address.indexOf('192.')>-1||v.address.indexOf('172.')>-1||v.address.indexOf('10.')>-1 });

  var ip = IPS.shift();
  if(!ip) return;

  global.IP = ip.address;
  global.HOSTNAME = HOSTNAME;

}



/********* Net Socket Part ************/
// server
require('net').createServer(function (socket) {
    //console.log("connected");
    socket.on('error', function(err){
        console.log(err);
    });
    socket.on('data', function (data) {
        if(!data) return;

        data = data.toString();

        console.log(data);
        // we get a 'exit' signal from PDFCreator, and get next file to proceed in DownloadQueue
        if(data=='exit') {
        	socket.write('exit');
        	if(curData){

        		console.log('done', curData.msgid);
	  		  ws.send( JSON.stringify({ type:'printerMsg', msgid:curData.msgid, data:curData, printerName:CLIENT_NAME, errMsg:'ok' }) );
		      curData = '';
          clearInterval(interCheckProc);
		      clearTimeout(timeoutCheckProc);
		      downloadAndCreatePDF();

        	}
	        return;

        }

        try{
            data = JSON.parse(data);
        } catch(e){
            return console.log(data, 'Bad JSON');
        }

        if(data.length<5) return;
        data = data.slice(2);


        socket.write('ok');
        upfileToQiniu(data[0], data[1], PDF_DIR+data[2], curData);

    });
})
.listen(81, function(){ console.log('socket ready') });


/********* Http Server Part ************/


http.createServer(function(clientReq, res) {
	// clientReq keys:  
	// [ '_readableState', 'readable', 'domain', '_events', '_maxListeners', 'socket', 'connection', 'httpVersion', 'complete', 'headers', 'trailers', '_pendings', '_pendingIndex', 'url', 'method', 'statusCode', 'client', '_consuming', '_dumped', 'httpVersionMajor', 'httpVersionMinor', 'upgrade' ]

	function sendResponse (title, body) {
		res.writeHead(200, {"Content-Type": "text/html"});
        res.write('<html><head><meta charset="utf-8"><title>'+ title +'</title></head>\
        	<body>'+ body +'</body>\
        	</html>');
        res.end();
	}

	function root () {
		sendResponse('更新客户端姓名', '<form action="http://'+ global.IP + ':'+HTTP_PORT +'/updateUser">ID:<input type=text name=userName placeholder="在此输入您的ID"><input type="submit" value="更新"></form>' );
	}

	function updateUser () {
		var userName = req.query.userName;
		exec( 'nbtstat -A '+clientIP, function  (err, stdout, stderr) {
			if(err) console.log(err, stderr);
			// var stat = TableParser.parse(stdout);
      var stat = stdout.split(/\r\n/);
			var clientName = '';
			
      _.find(stat, function  (v, i) {
        if( v.match(/UNIQUE\s+Registered/) ){
          clientName = v.replace(/^\s+/,'').split(/\s+/).shift();
		  clientName = clientName.replace(/\s*<.*>/,'');
          return true;
        }
      });

			if(!clientName) return sendResponse('更新失败', '<p>无法获取计算机名</p>');;

			request.post(
			    host+'/updateHost',
			    {form: {person:userName, hostname:clientName, ip:clientIP } },
			    function (err, response, body) {
			    	if(err) console.log(err);
			    	console.log('Update Client Info:', {person:userName, hostname:clientName, ip:clientIP } );
			    	if(body=='OK'){
			    		sendResponse('更新成功', '<p>更新成功</p><p>'+ userName +'</p><p>'+ clientName +'</p><p>'+ clientIP +'</p>');
			    	} else {
			    		sendResponse('更新失败', '<p>未找此用户</p><p>'+ userName +'</p><p>'+ clientName +'</p><p>'+ clientIP +'</p>');
			    	}
			    }
			);

		} );

	}


	var clientIP = clientReq.headers['x-forwarded-for'] || clientReq.connection.remoteAddress;
	var req = url.parse( clientReq.url, true );

	switch(req.pathname){
		case '/':
			root();
			break;
		case '/updateUser':
			updateUser();
			break;

	}



}).listen(HTTP_PORT);


/********* WebSocket Part ************/

// define client Name of this websocket


var curData;  // This global var store the src EXCEL/WORD etc file then pass to QiNiu as curData
var DownloadQueue = [];
var clientUpMsg;

var ws = new WebSocket('ws://1111hui.com:3000');

ws.on('close', function () {
	console.log('ws server closed, please restart');
	setTimeout(function restartNode () {
		throw 'ws server closed';
	}, 1000);
});
ws.on('error', function (err) {
	console.log('ws server connection error', err);
	setTimeout(function restartNode () {
		throw 'ws server cannot get connect';
	}, 1000);

});


ws.on('open', function () {
  updateHostName();
  console.log( global.IP );
  clientUpMsg = JSON.stringify({ type:'clientConnected', hostName:global.HOSTNAME, ip:global.IP, clientName:CLIENT_NAME, clientRole:'printer', clientOrder:CLIENT_ORDER });

  ws.send( clientUpMsg );
});

ws.on('message', function(data, flags) {
  try{
  	data = JSON.parse(data);
  } catch(e){ return; }

  if(data.clientName!==CLIENT_NAME) return;

  if( data.task == 'generatePDF' ) {

  // data format : {task, + qiniu data: key, fname, ... }
    DownloadQueue.push(data);
    downloadAndCreatePDF();

  }

  if( data.task == 'printPDF' ) {

  // data format : {task, server, printer, fileKey, shareID, person, isLabel}

    downloadAndPrint(data.fileKey, data.printer, data.shareID, data.person, data);

  }


});

// pull ever minute to keep ws online
// https://github.com/websockets/ws/issues/584
setInterval(function(){
	//if(ws.readyState==1) ws.ping('ping', { mask: true, binary: true }, true);
	if(ws.readyState==1 && clientUpMsg) ws.send(clientUpMsg);
}, 30000);


function convertFail () {
    ws.send( JSON.stringify({ type:'printerMsg', msgid:curData.msgid, data:curData, printerName:CLIENT_NAME, errMsg:'转换发生错误' }) );
    curData = '';
    clearInterval(interCheckProc);
    downloadAndCreatePDF();
}

function checkPDFCreator () {
  return;

  exec('tasklist', function(err, stdout, stderr) {
  	if(err) console.log(err);

    var task = TableParser.parse(stdout);


    var list = [];
    task.forEach(function changeTitleToOrder (v) {
      var i=0, obj = {};
      _.each(v, function (v2, k2) {
        obj[i++] = v2;
      });
      list.push(obj);
    });

    //console.log(list);
    var proc = _.find(list, function(v){ return v[0][0].match(/PDFCreator\.exe/i) } ) ;

    //console.log( proc?proc[1][0] : 0 );

    if( !proc ){  // PDFCreator will spawn 2 process, and there's no proc by chance, and may got error msg by chance, so comment below

      //convertFail();

    } else if(curData) {
    	var pid = proc[1][0];
    	if(!curData.procID) curData.procID = [pid];
    	else if( curData.procID.indexOf(pid)==-1 ) curData.procID.push(pid);
    }

    return proc;
    if(proc) console.log('find PDFCreator PID', proc[1][0]);

  });
}


function downloadAndCreatePDF () {
    if( curData ) return;

    var data = DownloadQueue.shift();
    if(!data) return;

    console.log('downloadAndCreatePDF', data);
    curData = data;
    clearTimeout( timeoutCheckProc );

    downloadFile(FILE_HOST + encodeURIComponent(data.key), function(err, file){
      if(err) return console.log(err);

      file = path.resolve(file);
      var cmd = util.format( '"%s" /PrintFile="%s" ', PDFCreatorPath, file );  // optional: /ManagePrintJobs

      var child = exec(cmd, function(err, stdout, stderr) {
         if (err) return console.log('exec result', child.pid, err, stdout, stderr );
      });

      interCheckProc = setInterval( checkPDFCreator , 300 );
      timeoutCheckProc = setTimeout(function(){
        if(curData){
          console.log('--PDF convert task timeout!');
          exec('tskill "PDFCreator*"', function(err, stdout, stderr) {});
          exec('tskill "EXCEL*"', function(err, stdout, stderr) {});
          exec('tskill "WORD*"', function(err, stdout, stderr) {});
          exec('tskill "POWERPNT*"', function(err, stdout, stderr) {});
          convertFail();
        }
      }, CONVERT_TIMEOUT);
    });
}

function downloadAndPrint (fileKey, printerName, shareID, person, data) {

    if(!fileKey || !printerName) return;

    var downloadUrl = host+'/downloadFile2/'+  encodeURIComponent(fileKey) +'?key='+ encodeURIComponent(fileKey) +'&shareID='+shareID+'&person='+person;

    console.log('downloadAndPrint', fileKey, shareID, printerName);

    //downloadFile(FILE_HOST + fileKey, function(err, file){
    downloadFile( downloadUrl, function(err, file){
      if(err) return console.log(err);

      file = path.resolve(file);
      var cmd;

      if(data.isLabel){
        var imgFile = file.replace(/\.pdf$/, '.jpg');
        cmd = 'convert -geometry 640x400 -density 203x203 -resample 203x203 -depth 8 -quality 100 "'+file+'" "'+ imgFile +'" && rundll32 C:\\WINDOWS\\system32\\shimgvw.dll,ImageView_PrintTo /pt "'+ imgFile +'" "'+printerName+'"';
      } else {
        cmd = util.format( '"%s" -t "%s" "%s" ', PDFReaderPath, file, printerName );  // optional: /ManagePrintJobs
      }

      //cmd = util.format( '"%s" -silent -print-to "%s" "%s"', PDFReaderPath, printerName, file );  
      //using sumatrapdf : https://github.com/sumatrapdfreader/sumatrapdf
      
      // cmd = util.format( '"%s" /N /T "%s" "%s"', "d:\\Program Files\\Adobe\\Reader 9.0\\Reader\\AcroRd32.exe", file, printerName );  //using Adobe AcrobatReader

      console.log(cmd);
	    ws.send( JSON.stringify({ type:'printerMsg', msgid:data.msgid, data:data, printerName:CLIENT_NAME, errMsg: err }) );

      var child = exec(cmd, function(err, stdout, stderr) {
        if (err){
          	// return callback(stderr);
         	console.log('print result', child.pid, err, stdout, stderr);
        }

      });

    });
}



function wsSendServer (msg) {
	ws.send( JSON.stringify(msg) );
}


function downloadFile (file_url, callback) {
	if(!callback) callback=function(){}
	// App variables
	var DOWNLOAD_DIR = 'downloads/';

	// We will be downloading the files to a directory, so make sure it's there
	// This step is not required if you have manually created the directory

	mkdirp(DOWNLOAD_DIR, function(err) {
	    //if (err) return callback(stderr);
	    download_file_httpget(file_url);
	});

	// Function to download file using HTTP.get
	var download_file_httpget = function(file_url) {
	var options = {
	    host: url.parse(file_url).host,
	    port: 80,
	    path: url.parse(file_url).pathname
	};

	var file_name = url.parse(file_url).pathname.split('/').pop();
	var file = fs.createWriteStream(DOWNLOAD_DIR + file_name);
  console.log(file_url);

	http.get(file_url, function(res) {
	    res.on('data', function(data) {
	            file.write(data);
	        }).on('end', function() {
	            file.end();
	            console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR);
	            callback(null, DOWNLOAD_DIR + file_name);
	        }).on('error', function(err) {
	            file.end();
	            callback(err);
	        });
	    });
	};


}


function upfileToQiniu(client, title, file, curData) {

    title = title.replace('Microsoft', '');

    var ext = path.extname(file);
    var saveFile = path.basename(file); //formatDate('yyyymmdd-hhiiss') + Math.random().toString().slice(1,5) + ext;

    request.post(
        host+'/getUpToken',
        function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.log(error);
                return;
            }

            var uptoken = body;


            qiniu.io.putFile(uptoken, saveFile, file, null, function(err, ret) {
              if(err) return console.log('error', err);

              // ret = _.mapObject(ret, function  (v,i) {
              // 	return safeEval(v);
              // });

              if(curData){
	              ret.person = curData.person;
	              ret.client = curData.client;
	              ret.title = curData.title+'.pdf';
	              ret.path = curData.path;
                if(curData.key) ret.srcFile = curData.key;
	              if(curData.shareID) {
                  ret.shareID = safeEval(curData.shareID);
                  ret.role = 'share';
                }
	              //ret.path = "/abc/";
	          } else {
	          	ret.client = client.toLowerCase();
	          	ret.title = title;
	          }


              saveIntoServer(ret);

            });
        }
    );


}

function safeEval (str) {
  try{
    var ret = JSON.parse(str);
  }catch(e){
    ret = str
  }
  return /object/i.test(typeof ret) ? (ret===null?null:str) : ret;
}


function saveIntoServer (info) {

	request.post(
	    host+'/upfile',
	    {form:info},
	    function (err, response, body) {

        	fs.unlink(PDF_DIR+info.key);
	        if (response.statusCode == 404) {
	        	console.log('no client found:', info.client );
	        }
	        if (!err && response.statusCode == 200) {
	        	console.log(body);
	        }
	    }
	);

}


// sleep(35000);
// function sleep(sleepTime) {
// for(var start = +new Date; +new Date - start <= sleepTime; ) { }
// }

