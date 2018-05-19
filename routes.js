/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Router.onBeforeAction(function() {
    if (Meteor.user() && Meteor.user().isBanned) {
        return this.render('forbidden');
    } else {
        return this.next();
    }
});

Router.route('/admin', {
    name: 'Admin Screen',
    template: 'adminScreen'
});

Router.route('/@:handle', function() {
    var handle = this.params.handle;

    if (!handle) handle = Meteor.userId();

    let id = Meteor.absoluteUrl() + "actors/" + handle;

    if (this.ready()) {
        if (handle) this.render('userProfile', {data: {id: id}});
        else this.render('errorPage', {data: {_id: id}});
    }
});

Router.route('/user', function() {
    var id = Meteor.userId();

    if (this.ready()) {
        if (id) this.render('userProfile', {data: {id: id}});
        else this.render('errorPage', {data: {_id: id}});
    }
});

Router.route('/users', {
    name: 'userList',
    template: 'userList'
});

Router.route('/federation', {
    name: 'federation',
    template: 'federation'
});

Router.route('/forum', {

    onRun: function() {
        var id = this.params.query.post;

        if (id && this.ready()) {
            this.state.set("postID", id);
        }
        this.next();
    },
    action: function() {
        if (this.ready()) {
            this.render('forum');
        } else this.render('errorPage', {data: {_id: id}});
    }
});

/*Router.route('/search/:_id', function() {
    var id = this.params._id;

    if (this.ready()) {
        var tag = Tags.findOne({_id: id});
        if (tag) this.render('search', {data: tag});
        else this.render('errorPage', {data: {_id: id}});
    }
});*/
