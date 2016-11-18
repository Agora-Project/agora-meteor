Router.onBeforeAction(function() {
    if (Meteor.user() && Meteor.user().isBanned) {
        return this.render('forbidden');
    } else {
        return this.next();
    }
});

Router.route('/forum', {
    name: 'forumIndex',
    template: 'forumIndex'
});

Router.route('/forum/post/:_id', function() {
    var routerThis = this;
    var id = this.params._id;
    
    this.wait(Meteor.subscribe('forum', id));
    
    if (this.ready()) {
        var post = Post.findOne({_id: id});
        if (post) routerThis.render('expandedPost', {data: post});
        else routerThis.render('postNotFound', {data: {_id: id}});
    }
    else routerThis.render('loading');
});

Router.route('/forum/users', {
    name: 'forumUsers',
    template: 'forumUsers'
});
