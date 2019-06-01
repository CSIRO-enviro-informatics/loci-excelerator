//A script to get the cache dataset objects that dont have area, and create a turtle file to ammend it.
const axios = require('axios');
const querystring = require('querystring');
const async = require("async");

const SPARQL_URI = "http://db.loci.cat/repositories/cache"
const USER = "ro";
const PASSWORD = "locireadonly"; //Yes it's bad to have password here, but its only for the readonly user, and the data is public anyway

var allObjectsQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX dct: <http://purl.org/dc/terms/>
prefix dbp: <http://dbpedia.org/property/>
PREFIX nv: <http://qudt.org/schema/qudt#numericValue>
PREFIX qu: <http://qudt.org/schema/qudt#unit>
PREFIX m2: <http://qudt.org/schema/qudt#SquareMeter>
PREFIX c: <http://www.opengis.net/ont/geosparql#sfContains>
PREFIX f: <http://www.opengis.net/ont/geosparql#Feature>
PREFIX l: <http://linked.data.gov.au/dataset/mb16cc>

SELECT *
WHERE {
    ?s 
       rdf:subject ?sub;
       rdf:predicate ?pred ;
       rdf:object ?obj .
    OPTIONAL {
        ?sub dbp:area [ nv: ?subValue ;
                        qu: ?subUnit ] .
    }
    OPTIONAL {
        ?obj dbp:area [ nv: ?objValue ;
                        qu: ?objUnit ] .    
    }
    FILTER (?pred != c: )
}`;

//The optional area are there incase I want to only get the fields with missing areas

var data = `${USER}:${PASSWORD}`;
var buff = new Buffer(data);
var base64data = buff.toString('base64');

function getQueryAsUrl(query) {
    var queryString = querystring.stringify({
        query
    });
    return `${SPARQL_URI}?${queryString}`;
}

axios.get(getQueryAsUrl(allObjectsQuery), {
    headers: {
        Accept: 'application/sparql-results+json',
        Authorization: `Basic ${base64data}`
    }
}).then(response => {
    var objects = new Set();
    response.data.results.bindings.forEach(match => {
        objects.add(match.sub.value);
        objects.add(match.obj.value);
    });
    async.eachOfSeries(objects, (uri, i, done) => {
        if (uri.indexOf('gnaf') == -1) {
            axios.get(`${uri}?_format=application/ld+json`).then(res => {
                var nodes = res.data;
                var objNode = nodes.find(x => x['@id'] == uri);
                if (uri.indexOf('meshblock') != -1) {
                    var areaId = objNode['http://linked.data.gov.au/def/asgs#hasArea'][0]['@id'];
                    var areaNode = nodes.find(x => x['@id'] == areaId);
                    var area = areaNode['http://qudt.org/schema/qudt/numericValue'][0]['@value'];
                }
                if(uri.indexOf('catchment') != -1) {
                    var area = objNode['http://linked.data.gov.au/dataset/geof/v2/ahgf_hrc/albersarea'][0]['@value'];
                }
                if(area) { //on print found areas
                    console.log(`<${uri}> dbp:area [ nv: ${area} ; qu: <http://qudt.org/schema/qudt#SquareMeter> ] .`)
                } else {
                    //might want to flag missing areas somehow.
                }
                done(null);
            }).catch(function (error) {
                console.error(`Cant Access: ${uri}`);
                done(null); 
            });
        } else {
            done(null); //skip gnafs
        }
    })
}).catch(function (error) {
    console.error(error);
});

