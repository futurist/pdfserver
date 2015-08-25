/*
* PDFCreator: profile setting: 
* Save: <DateTime:yyyyMMddHHmmss>-<Counter>
* Auto-Save: E:\PDFs\<ClientComputer>\
* Actions: D:\nodejs\node.exe "d:\crx\pdfserver\app.js" "<ClientComputer>" "<Title>" "<OutputFilePath>"
*/

var qiniu = require('qiniu');
var path = require('path');
var fs = require('fs');

var request = require('request');

var host = 'http://1111hui.com:88';

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



/********* Net Socket Part ************/
// server
require('net').createServer(function (socket) {
    //console.log("connected");
    socket.on('error', function(err){
        //console.log(err);
    });
    socket.on('data', function (data) {
        if(!data) return;
        try{
            data = JSON.parse(data.toString());
        } catch(e){
            return console.log('Bad JSON');
        }

        if(data.length<5) return;
        data = data.slice(2);
        console.log(data);

        upfileToQiniu(data[0], data[1], data[2]);

    });
})
.listen(81, function(){ console.log('socket ready') });


function upfileToQiniu(client, title, file) {

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

            log.log( saveFile, client, title, file, JSON.stringify(process.argv) );

            qiniu.io.putFile(uptoken, saveFile, file, null, function(err, ret) {
              if(err) return console.log('error', err);
              ret.person = "yangjiming";
              ret.client = client;
              ret.title = title;
              //ret.path = "/abc/";
              saveIntoServer(ret);

            });
        }
    );
    

}

function saveIntoServer (info) {

	request.post(
	    host+'/upfile',
	    { form: info },
	    function (error, response, body) {
	        if (!error && response.statusCode == 200) {
	            console.log(body)
	        }
	    }
	);

}


// sleep(35000);
// function sleep(sleepTime) {
// for(var start = +new Date; +new Date - start <= sleepTime; ) { }
// }

