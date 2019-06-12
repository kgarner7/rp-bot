$(function() {
  $("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
  });

  const socket = io();
  socket.on("inventory", msg => console.log(msg));
  socket.emit("inventory");
});
