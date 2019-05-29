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
    }
    
}