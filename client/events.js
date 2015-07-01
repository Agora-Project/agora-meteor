Template.layout.events({
  'click .button-post': function () {
    Router.go('/post');
  },
  'click .button-users': function () {
    Router.go('/users');
  },
  'click .button-home': function () {
    Router.go('/');
  },
  'click #at-nav-button': function () {
    Router.go('/login');
  }
});

Template.post.events({
  "click #new-thread": function (event) {
    var title = $('#thread-title input').val();
    var body = $('#thread-body input').val();

    var links = [];

    for (var key in Session.get('selectedTargets')) {
      links.push(key);
    }

    Argument.insert({
      ownerId: Meteor.userId(),
      title: title,
      body: body,
      links: links
    });
    
    Router.go('/');
  }
});
