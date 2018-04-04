/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

//An object that maps keys to values.  A map cannot contain duplicate keys; each
//key can map to at most one value. Keys and values are compared by identity,
//not equality. This is useful in cases where specific instances of objects are
//to be stored or associated. Almost anything may be used as a key or value,
//including primitives, null, undefined, arrays, objects, or functions. The only
//exception is NaN, which may never be used as a key.
IdentityMap = function() {
    let keys = [];
    let values = [];
    
    //Returns the number of key-value mappings in this identity map.
    this.size = function() {
        return keys.length;
    };
    
    //Returns true if this map contains no key-value mappings.
    this.isEmpty = function() {
        return keys.length === 0;
    };
    
    //Tests whether the specified object reference is a key in this identity
    //map.
    this.containsKey = function(key) {
        return keys.indexOf(key) !== -1;
    };
    
    //Tests whether the specified object reference is a value in this identity
    //map.
    this.containsValue = function(value) {
        return values.indexOf(value) !== -1;
    };
    
    //Returns the value to which the specified key is mapped, or null if this
    //map contains no mapping for the key. A return value of null does not
    //necessarily indicate that the map contains no mapping for the key; it's
    //also possible that the map explicitly maps the key to null.
    this.get = function(key) {
        let index = keys.indexOf(key);
        
        if (index === -1) {
            return null;
        }
        
        return values[index];
    };
    
    //Associates the specified value with the specified key in this identity
    //map. If the map previously contained a mapping for the key, the old value
    //is replaced and returned. Otherwise, null is returned. A null return can
    //also indicate that the map previously associated the key with null. Note
    //that NaN may not be used as a key, as it has no identity by definition.
    this.put = function(key, value) {
        if (key !== key) {
            return null; //Key is NaN.
        }
        
        let index = keys.indexOf(key);
        
        if (index !== -1) {
            let oldValue = values[index];
            values[index] = value;
            return oldValue;
        }
        
        keys.push(key);
        values.push(value);
        return null;
    };
    
    //Removes and returns the mapping for this key from this map if present.
    //Returns null if no such mapping existed. A null return can also indicate
    //that the map previously associated the key with null.
    this.remove = function(key) {
        let index = keys.indexOf(key);
        
        if (index === -1) {
            return null;
        }
        
        let oldValue = values[index];
        keys.splice(index, 1);
        values.splice(index, 1);
        return oldValue;
    };
    
    //Removes all of the mappings from this map.
    this.clear = function() {
        keys = [];
        values = [];
    };
    
    //Performs the given action for each key-value pair in this identity map
    //until all entries have been processed.
    this.forEachEntry = function(action) {
        let size = keys.length;
        for (let i = 0; i < size; i++) {
            action(keys[i], values[i]);
        }
    };
}

//A collection that contains no identical elements.
IdentitySet = function() {
    //This is exposed so we can iterate over it easily. Do not modify.
    this.elements = [];
    
    //Returns the number of elements in this identity set.
    this.size = function() {
        return this.elements.length;
    };
    
    //Returns true if this set contains no elements.
    this.isEmpty = function() {
        return this.elements.length === 0;
    };
    
    //Tests whether the specified object is an element in this identity set.
    this.contains = function(obj) {
        return this.elements.indexOf(obj) !== -1;
    };
    
    //Adds the specified element to this set, and returns true if it is not
    //already present.
    this.add = function(element) {
        if (element !== element) {
            return false; //Element is NaN.
        }
        
        if (this.elements.indexOf(element) !== -1) {
            return false;
        }
        
        this.elements.push(element);
        return true;
    };
    
    //Removes the specified element from this set and returns true, if it is
    //an element in this set.
    this.remove = function(element) {
        let index = keys.indexOf(element);
        if (index === -1) {
            return false;
        }
        
        this.elements.splice(index, 1);
        return true;
    };
    
    //Removes all of the mappings from this map.
    this.clear = function() {
        this.elements = [];
    };
    
    //Performs the given action for each element in this identity set until all
    //entries have been processed.
    this.forEach = function(action) {
        for (let element of this.elements) {
            action(element);
        }
    };
}
