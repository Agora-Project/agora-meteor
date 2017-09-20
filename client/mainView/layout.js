MainViewLayout = function() {

    let localPostPositions = new Mongo.Collection(null);

    this.init = function(initPostArray) {
        for (let post of initPostArray) {
            localPostPositions.insert(post);
        }
        LayeredGrapher.layoutGraph(localPostPositions);
        return localPostPositions.find({}).fetch();
    };

    this.addPost = function(post) {
        return LayeredGrapher.insertPost(localPostPositions, post);
    };

    this.removePost = function(post) {
        return LayeredGrapher.removePost(localPostPositions, post);
    };

    this.updatePost = function(id, fields) {
        localPostPositions.update({_id: id},{$set: fields});
    };

}
