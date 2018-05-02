Template.federation.onCreated(function() {
    this.content = new ReactiveVar();
});

Template.federation.onRendered(function() {

});

Template.federation.helpers({
    content: function() {
        return Template.instance().content.get();
    }
});

Template.federation.events({
    'click #federation-query-button': function() {
        let instance = Template.instance();
        Meteor.call("getActivityJSONFromUrl", $('#federation-url').val(), function(err, response) {
            if (err) console.log("Error:", err);
            if (response) instance.content.set(JSON.stringify(response));
        });
    },
});

Template.federation.onDestroyed(function() {

});
