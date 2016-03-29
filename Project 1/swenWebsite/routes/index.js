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
	var searchInput = req.query.searchString;
	var searchResults = [];
	
	client.execute(tei + "//TEI[. contains text '"+ searchInput +"']",
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
									search: searchInput});
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
