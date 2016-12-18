Router.onBeforeAction(function() {
    if (Meteor.user() && Meteor.user().isBanned) {
        return this.render('forbidden');
    } else {
        return this.next();
    }
});

Router.route('/forum', {
    name: 'forumIndex',
    template: 'doubleView'
});

Router.route('/forum/post/:_id', function() {
    var routerThis = this;
    var id = this.params._id;

    this.wait(Meteor.subscribe('post', id));

    if (this.params.query.view == "forum") {
        if (this.ready()) {;
            routerThis.render('detailedView', {data: id});
        }
    } else {
        if (this.ready()) {
            var post = Post.findOne({_id: id});
            if (post) routerThis.render('expandedPost', {data: post});
            else routerThis.render('expandedPostNotFound', {data: {_id: id}});
        }
        else routerThis.render('expandedPostLoading');
    }
});

Router.route('/forum/user/:_id', function() {
    var routerThis = this;
    var id = this.params._id;

    if (this.ready()) {
        var user = Meteor.users.findOne({_id: id});
        if (user) routerThis.render('userProfile', {data: user});
        else routerThis.render('expandedPostNotFound', {data: {_id: id}});
    }
    else routerThis.render('expandedPostLoading');
});

Router.route('/forum/users', {
    name: 'userList',
    template: 'userList'
});
