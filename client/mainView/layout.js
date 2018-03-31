/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

MainViewLayout = function() {

    this.localPostPositions = new Mongo.Collection(null);

    this.init = function(initPostArray) {
        for (let post of initPostArray) {
            this.localPostPositions.insert(post);
        }
        LayeredGrapher.layoutGraph(this.localPostPositions);
        return this.localPostPositions.find({}).fetch();
    };

    this.addPost = function(post) {
        return LayeredGrapher.insertPost(this.localPostPositions, post);
    };

    this.removePost = function(post) {
        return LayeredGrapher.removePost(this.localPostPositions, post);
    };

    this.updatePost = function(id, fields) {
        this.localPostPositions.update({_id: id},{$set: fields});
    };

}
