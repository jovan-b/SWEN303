var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var basex = require('basex');
var fs = require('fs');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });

var tei = "XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; ";

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
	
	/* Check both strings to see what type of search the user is after */
	if(searchString.length != 0){
		/* Replace all occurances of AND, OR and NOT with the xQuery equivalents */
		var logicalString = searchString
			.replace(" AND ", '\' ftand \'')
			.replace(" OR ", '\' ftor \'')
			.replace(" NOT ", '\' ftnot \'');
			
		query = tei + "//TEI[. contains text '"+ logicalString +"' using wildcards]";
	}
	else{
		query = tei + searchMarkup;
	}
	
	/* Execute the query and load the results */
	client.execute(query,
	function(error,result){ 
		if(!error){ 
			/* Pass the results into cheerio to return a list with the title, author and ID */
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
			/* If we had search results, pass it onto the search page, else redirect to the xquery search */
			if(searchResults.length != 0){
				res.render('search', { title: 'Colenso Project | Search Results', results: searchResults,
									searchString: searchString});
			}
			else{
				res.redirect('/xsearch?search='+searchMarkup);
			}
		}
		else{
			console.log(error);
			res.render('search', { title: 'Colenso Project | Error'});
		}
	} )
});

router.get('/xsearch', function(req, res) {
	var search = decodeURIComponent(req.query.search);
	var query = tei + "for $x in " + search + " return db:path($x)";
	client.execute(query,
	function(error, result){
		if(!error){
			/* Split the paths into their own array item and display the search results */
			var queryResults = result.result.split('\n');
			res.render('xsearch', { title: 'Colenso Project | Search Results', results: queryResults,
									searchMarkup: search});
		}
		else{
			res.render('xsearch', { title: 'Colenso Project | Error'});
			console.log(error);
		}
	})
});

router.get('/view', function(req, res) {
	var path = req.query.path;
	var id = req.query.id;
	/* Get the raw TEI and display it on the web page */
	client.execute("XQUERY doc('Colenso/" + path + "')", 
	function(error,result) { 
		if(!error){
			res.render('view', { title: 'Colenso Project | '+id, content: result.result, id: id, path: path});	
		}
		else{
			console.log(error);
			res.render('view', { title: 'Colenso Project | Error'});
		}
	})
	
});

router.get('/findxml', function(req, res) {
	var id = req.query.id;
	/* Returns the path from the XML documents ID */
	client.execute(tei +  "for $x in //TEI[@xml:id='" + id + "'] return db:path($x)" ,
	function(error, result){	
		res.redirect('/view?path='+result.result+'&id='+id);
	})
});

router.get('/browseall', function(req, res) {
	/* Get all XML paths in the database and display the results */
	client.execute("XQUERY db:list('Colenso')",
		function (error, result) {
			if(!error){ 
				var allXml = result.result.split('\n');
				res.render('browseall', { title: 'Colenso Project | All Documents', results: allXml});
			}
			else {
				console.error(error);
				res.render('browseall', { title: 'Colenso Project | Error'});
			}
		}
	);
});

router.get('/download', function(req, res) {
	var path = 'Colenso/'+req.query.path;
	var id = req.query.id;
	/* Get the raw TEI */
	client.execute("XQUERY doc('" + path + "')", 
	function(error,result) { 
		if(!error){
			var content = result.result
			/* Set it up to send as an attachment and write the xml content into the file */
			res.setHeader('Content-disposition', 'attachment; filename='+id);
			res.write("<?xml version='1.0' encoding='utf-8'?>\n");
			res.write(content);
			res.end();
		}
		else{
			console.log(error);
			res.render('index', { title: 'Colenso Project | Home', reportMsg: 'Error: Cannot find file to download.'});
		}
	})
});

router.get('/upload', function(req, res) {
	res.render('upload', { title: 'Colenso Project | Upload'});
});

router.post('/upload', upload.single('file'), function (req, res) {
	if(req.file != undefined){
		var path = req.file.path;
		var name = req.file.originalname;\
		/* Read the file and save it in data*/
		fs.readFile(path, "utf-8", function(error, data) {
			if(!error){
				/* Add the uploaded file to the database */
				client.execute('ADD TO Colenso/uploaded_files/'+name+' "'+data+'"',
				function(error, result){
					if(!error){
						res.render('upload', { title: 'Colenso Project | Upload',
							reportMsg: 'File successfully uploaded to database.'});
					}
					else{
						res.render('upload', { title: 'Colenso Project | Upload',
							reportMsg: 'Error: File could not be uploaded.'});
					}
				});
			}
			else{
				console.log(error);
				res.render('upload', { title: 'Colenso Project | Upload',
					reportMsg: 'Error: Could not read file.'});
			}
		});
	}
	else{
		res.render('upload', { title: 'Colenso Project | Upload',
			reportMsg: 'Error: No file chosen'});
	}
});

router.post('/edit', function(req, res){
	var editText = req.body.editText;
	var path = req.query.path;
	/* Replace the XML doc with the edit text box */
	client.execute("REPLACE "+path+" "+editText, function(error, result){
		if(!error){
			res.render('index', { title: 'Colenso Project | Home', reportMsg: 'Succesfully edited'});	
		}
		else{
			console.log(error);
			res.render('index', { title: 'Colenso Project | Home', reportMsg: 'Error: Unable to edit.'});	
		}
	});
});


module.exports = router;
