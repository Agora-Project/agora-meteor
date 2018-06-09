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

Router.route('/@:handle', {
    template: 'userProfile',
    data: function() {
        var handle = this.params.handle;

        if (!handle) handle = Meteor.userId();

        let id = Meteor.absoluteUrl() + "actors/" + handle;

        return {id: id};
    }
});

Router.route('/user', function() {
    var id = Meteor.user().actor;

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

Router.route('/recent', {
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

Router.route('/home', {
    action: function() {
        if (this.ready()) {
            this.render('homeTimeline');
        } else this.render('errorPage');
    }
});
