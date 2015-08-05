// **
* PDFCreator: profile setting: 
* Save: <DateTime:yyyyMMddHHmmss>-<Counter>
* Auto-Save: E:\PDFs\<ClientComputer>\
* Actions: D:\nodejs\node.exe "d:\crx\pdfserver\app.js" "<ClientComputer>" "<Title>" "<OutputFilePath>"
*/

var qiniu = require('qiniu');
var path = require('path');
var fs = require('fs');

var request = require('request');

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


qiniu.conf.ACCESS_KEY = '2hF3mJ59eoNP-RyqiKKAheQ3_PoZ_Y3ltFpxXP0K';
qiniu.conf.SECRET_KEY = 'xvZ15BIIgJbKiBySTV3SHrAdPDeGQyGu_qJNbsfB';

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


if(process.argv.length<3) process.exit();

var client = process.argv[2].replace(/\\/g,"").replace(/\//g,"");
var title = process.argv[3];
var file = process.argv[4];

title = title.replace('Microsoft', '');

var ext = path.extname(file);
var saveFile = path.basename(file); //formatDate('yyyymmdd-hhiiss') + Math.random().toString().slice(1,5) + ext;

var responseBody =
{
	"key":"$(key)",
	"hash":"$(hash)",
	"imageWidth":"$(imageInfo.width)",
	"imageHeight":"$(imageInfo.height)",
	type:"$(type)",
	client:client,
	title:title,
	fname:"$(fname)",
	fsize:"$(fsize)"
};

var putPolicy = new qiniu.rs.PutPolicy(
	'bucket01',
	null,
	null,
	null,
	JSON.stringify( responseBody )
);

var uptoken = putPolicy.token();

log.log( uptoken,saveFile, file, JSON.stringify(process.argv) );

qiniu.io.putFile(uptoken, saveFile, file, null, function(err, ret) {
  log.log(err, ret);

  ret.person = "yangjm";
  //ret.path = "/abc/";
  saveIntoServer(ret);

});




function saveIntoServer (info) {

	request.post(
	    'http://1111hui.com:88/upfile',
	    { form: info },
	    function (error, response, body) {
	        if (!error && response.statusCode == 200) {
	            console.log(body)
	        }
	    }
	);

}


// sleep(35000);
function sleep(sleepTime) {
for(var start = +new Date; +new Date - start <= sleepTime; ) { }
}

