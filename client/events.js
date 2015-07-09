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
