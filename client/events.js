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
    var body = $('#thread-body textarea').val();

    Thread.insert({
      title: title,
      body: body,
      createdAt: new Date()
    });
    
    Router.go('/');
    //event.target.text.value = "";
    //Prevent default form submit
    //return false;
  }
});
