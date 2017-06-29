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
    var id = this.params._id;

    if (this.ready()) {
        if (id) this.render('userProfile', {data: {id: id}});
        else this.render('errorPage', {data: {_id: id}});
    }
    //else this.render('expandedPostLoading');
});

Router.route('/users', {
    name: 'userList',
    template: 'userList'
});

Router.route('/post/:_id', function() {
    var id = this.params._id;

    if (this.ready()) {
        if (id) {
            this.state.set("id", id);
            this.render('mainView', {data: {id: id}});
        }
        else this.render('errorPage', {data: {_id: id}});
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
