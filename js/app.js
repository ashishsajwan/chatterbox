/**
 * This is a backbone model which store
 * the friend's entity
 */
var FriendModel = Backbone.Model.extend({
  initialize: function() {}
});

/**
 * This is a backbone collection which store
 * the list of friends as collection
 */
var FriendsList = Backbone.Collection.extend({
  currentFriend: null,
  model: FriendModel,
  url: 'data/friends.json',
});

/**
 * This is a backbone view which is responsible
 * for rendering Header of the app
 */
var HeaderView = Backbone.View.extend({
  initialize: function() {
    this.render();
  },
  render: function() {
    var headerTemplate = _.template($('#Tpl-header').html());
    this.$el.html(headerTemplate);
    $('#app-header-container').html(this.el);
  }
});
/**
 * This is a backbone view which is responsible
 * for rendering Friends list, and chat column
 */
var BodyView = Backbone.View.extend({
  wsUri: "ws://echo.websocket.org/",
  websocket: null,
  events: {
    'click #friends-list .friend': 'loadFriendChat',
    'enter #send-msg': 'sendMessage',
    'clicl #send-btn': 'sendMessage'
  },
  initialize: function() {
    // listen to sync event on collection and then render the firneds list
    this.listenTo(this.collection, 'sync', this.renderFriendsList);
    this.render();
    this.collection.fetch();
  },
  //this is where we render the containers
  render: function() {
    this.$el.html(_.template($('#Tpl-body').html()));
    $('#app-body-container').html(this.el);
  },
  // render the log list
  renderFriendsList: function() {
    var friendTemplate = _.template($('#Tpl-friend').html());

    // render list if collection has some models

    _.each(this.collection.models, function(model) {
      $('#friends-list').append(friendTemplate(model.toJSON()));
    });
  },
  loadFriendChat: function(e) {
    var friendId = $(e.currentTarget).attr('data-friendid');
    this.collection.currentFriend = friendId;
    var chatTemplate = _.template($('#Tpl-chat').html());
    $('#chat-container').html(chatTemplate(this.collection.get(friendId).toJSON()));
  },
  sendMessage: function() {
    if (this.collection.currentFriend) {
      var message = $('#send-msg').val();
      this.writeMessage([{
        message: message,
        mine: true // mine coz sent by me
      }]);
      $('#send-msg').val('');
      websocket.send(message);
    }
  },
  writeMessage: function(data) {
    var messageTemplate = _.template($('#Tpl-message').html());
    $('#chat-box').prepend(messageTemplate({
      data: data
    }));
  },
  socketOpen: function(e) {
    console.log('connected', e);
  },
  socketClose: function(e) {
    console.log('Closed', e);
  },
  socketMessage: function(e) {
    console.log('Message', e.data);
    this.writeMessage([{
      message: e.data,
      mine: false // mine false coz i didn't send this
    }])
  },
  socketError: function(e) {
    console.log('ERROR', e);
  }
})

$(document).ready(function() {
  // capturing enter key on inputs and firing enter event
  // so that pressing enter of msg box works
  $('#app-body-container').on('keyup', '#send-msg', function(e) {
    if (e.keyCode == 13) {
      $(this).trigger('enter');
    }
  });

  var friendsList = new FriendsList();

  // create a object of Headerview
  // which will render header view of app
  var headerView = new HeaderView();

  var bodyView = new BodyView({
    collection: friendsList
  });

  websocket = new WebSocket(bodyView.wsUri);

  websocket.onopen = function(e) {
    bodyView.socketOpen(e);
  };
  websocket.onclose = function(e) {
    bodyView.socketClose(e);
  }
  websocket.onmessage = function(e) {
    _.delay(function() {
      bodyView.socketMessage(e);
    }, 1500);
  }
  websocket.onerror = function(e) {
    bodyView.socketError(e);
  }

});
