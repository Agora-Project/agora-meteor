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
        Meteor.call("importActivityJSONFromUrl", $('#federation-url').val(), function(err, response) {
            if (err) console.log("Error:", err);
            if (response) {
                let content = "";
                for (let property in response) {
                    content += ("<p>" + property + ": " + JSON.stringify(response[property]) + "</p>");
                }
                instance.content.set(content);
            }
        });
    },
});

Template.federation.onDestroyed(function() {

});
