export default Helpers = {
    aggregationMethods: {COUNT: 'count', AVG: 'avg', SUM: 'sum', MIN: 'min', MAX: 'max'},
    groupBy: function(list, keyGetter) {
        const map = new Map();
        list.forEach((item) => {
             const key = keyGetter(item);
             const collection = map.get(key);
             if (!collection) {
                 map.set(key, [item]);
             } else {
                 collection.push(item);
             }
        });
        return map;
    },
    trimChar(string, charToRemove) {
        while(string.charAt(0)==charToRemove) {
            string = string.substring(1);
        }
    
        while(string.charAt(string.length-1)==charToRemove) {
            string = string.substring(0,string.length-1);
        }
    
        return string;
    },
    devlog: function(msg) {
        Meteor.isDevelopment && console.log(msg);
    } 
}