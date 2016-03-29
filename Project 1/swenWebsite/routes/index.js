var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');

var tei = "XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; ";

var basex = require('basex');
var client = new basex.Session("localhost", 1984, "admin", "admin");
client.execute("open Colenso");


/* GET home page. */
router.get('/', function(req, res, next) {	
	res.render('index', { title: 'Colenso Project | Home'});
});

router.get('/search', function(req, res) {
	var searchString = req.query.searchString;
	var searchMarkup = req.query.searchMarkup;
	var searchResults = [];
	var query;
	
	if(searchString.length != 0){
		var logicalString = searchString
			.replace(" AND ", '\' ftand \'')
			.replace(" OR ", '\' ftor \'')
			.replace(" NOT ", '\' ftnot \'');
			
		query = tei + "//TEI[. contains text '"+ logicalString +"' using wildcards]";
	}
	else{
		query = tei + searchMarkup;
	}
	
	client.execute(query,
	function(error,result){ 
		if(!error){ 
			var data = cheerio.load(result.result,{
				xmlMode: true
			});
			data('TEI').each(function(i, elem){
				elem = cheerio(elem);
				searchResults.push({
					title: elem.find('title').first().text(),
					author: elem.find('author').first().text(),
					id: elem.attr('xml:id')
				});
			});
			res.render('search', { title: 'Colenso Project | Search Results', results: searchResults,
									searchString: searchString, searchMarkup: searchMarkup});
		}
		else{
			console.log(error);
			res.render('search', { title: 'Colenso Project | Error'});
		}
	} )
});

router.get('/view', function(req, res) {
	var path = 'Colenso/' + req.query.path;
	var id = req.query.id;
	client.execute("XQUERY doc('" + path + "')", 
	function(error,result) { 
		if(!error){
			res.render('view', { title: 'Colenso Project | '+id, content: result.result, id: id});	
		}
		else{
			console.log(error);
			res.render('view', { title: 'Colenso Project | Error' });
		}
	})
	
});

router.get('/findxml', function(req, res) {
	var id = req.query.id;
	client.execute(tei +  "for $x in //TEI[@xml:id='" + id + "'] return db:path($x)" ,
	function(error, result){	
		res.redirect('/view?path='+result.result+'&id='+id);
	})
});


module.exports = router;
