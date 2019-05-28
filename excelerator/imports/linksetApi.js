const querystring = require('querystring');

const SPARQL_URI = "http://db.loci.cat/repositories/cache"

export const NS = {
    "loci": "PREFIX loci: <http://linked.data.gov.au/def/loci#>",
    "owl": "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
    "rdf": "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
    "xsd": "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
    "rdfs": "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
    "dct": "PREFIX dct: <http://purl.org/dc/terms/>",
    "dc": "PREFIX dc: <http://purl.org/dc/elements/1.1/>",
    "void": "PREFIX void: <http://rdfs.org/ns/void#>",
    "prov": "PREFIX prov: <http://www.w3.org/ns/prov#>",
    "dcat": "PREFIX dcat: <http://www.w3.org/ns/dcat#>",
    "vcard": "PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>",
    "dbp": "PREFIX dbp: <http://dbpedia.org/property/>",
}

export const PROPS = {
    "title": "http://purl.org/dc/terms/title",
    "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "description": "http://purl.org/dc/terms/description",
    "issued": "http://purl.org/dc/terms/issued",
    "modified": "http://purl.org/dc/terms/modified",
    "subjectsTarget": "http://rdfs.org/ns/void#subjectsTarget",
    "linkPredicate": "http://rdfs.org/ns/void#linkPredicate",
    "objectsTarget": "http://rdfs.org/ns/void#objectsTarget"
}

export function getQueryAsUrl(query) {
    var queryString = querystring.stringify({
        query
    });
    return `${SPARQL_URI}?${queryString}`;
}

export function getQueryResults(query) {
    return HTTP.get(getQueryAsUrl(query), {headers: {Accept: 'application/sparql-results+json'}});
}

