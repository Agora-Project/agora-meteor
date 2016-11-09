import './imports/dotdotdot.min.js';
import './client.less';

Template.post.onRendered(function() {
    var instance = Template.instance();
    
    var postLink = Template.instance().$('.titleBar a');
    postLink.attr('title', postLink.text());
    
    var usernameLink = Template.instance().$('.username');
    usernameLink.attr('title', usernameLink.text());
    
    instance.$('.postContent').dotdotdot({
        after: "a.readMoreLink"
    });
});

Template.post.helpers({
    title: function() {
        return 'Frog Facts';
    },
    avatarURL: function() {
        return 'https://avatars3.githubusercontent.com/u/6981448';
    },
    username: function() {
        return 'SmashMaster';
    },
    content: function() {
        return 'The eyes of most frogs are located on either side of the head near the top and project outwards as hemispherical bulges. They provide binocular vision over a field of 100° to the front and a total visual field of almost 360°. They may be the only part of an otherwise submerged frog to protrude from the water. Each eye has closable upper and lower lids and a nictitating membrane which provides further protection, especially when the frog is swimming. Members of the aquatic family Pipidae have the eyes located at the top of the head, a position better suited for detecting prey in the water above. The irises come in a range of colours and the pupils in a range of shapes.';
    },
    replyCount: function() {
        return 752;
    }
});
