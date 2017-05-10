/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
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

Router.route('/user/:_id', function() {
    var routerThis = this;
    var id = this.params._id;

    if (this.ready()) {
        var user = Meteor.users.findOne({_id: id});
        if (user) routerThis.render('userProfile', {data: user});
        else routerThis.render('expandedPostNotFound', {data: {_id: id}});
    }
    else routerThis.render('expandedPostLoading');
});

Router.route('/users', {
    name: 'userList',
    template: 'userList'
});
