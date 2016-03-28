var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');

var basex = require('basex');
var client = new basex.Session("localhost", 1984, "admin", "admin");
client.execute("open Colenso");

function getPlace(){
	client.execute("XQUERY declare namespace tei= 'http://www.tei-c.org/ns/1.0'; " +
	"//tei:name[@type = 'place' and position() = 1 and . = 'Manawarakau']",
	function(err,res){ 
		if(!err){ 
			//console.log(res.result)
			return res.result
		}
	} )
}


/* GET home page. */
router.get('/', function(req, res, next) {	
	res.render('index', { title: 'Colenso Project'});
});

router.get('/search', function(req, res) {
	var result = "";
	client.execute("XQUERY declare namespace tei= 'http://www.tei-c.org/ns/1.0'; " +
	"//tei:name[@type = 'place' and position() = 1 and . = '"+ req.query.searchString +"']",
	function(error,result){ 
		if(!error){ 
			res.render('search', { title: 'Colenso Project', content: result.result });
			console.log(result.result)
		}
	} )
});


module.exports = router;
