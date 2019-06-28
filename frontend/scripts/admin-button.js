$(function() {
  const data = [
    ["hours", 60],
    ["minutes", 60],
    ["seconds", 1000],
    ["millis", 1]
  ];

  const socket = io.connect("/button");
  let countdownId = 0,
    done = false,
    listenerId = 0,
    state = undefined;

  $("#countdown").on("click", () => {
    if (state === "ready") {
      socket.emit("start");
    } else if (state === "started") {
      const target = done ? "clear" : "reset";
      socket.emit(target);
    } else if (state === "done") {
      socket.emit("clear");
    }
  });

  function setState(className, text) {
    $("#countdown")
      .prop("class", "btn btn-large btn-block mt-3 btn-" + className)
      .text(text);
  }

  socket.on("time", data => {
    clearInterval(countdownId);
    if (data) {
      const timeInMillis = parseInt(data.length);
      state = data.status;

      $("#countdown").show();
      updateTime(timeInMillis);
      
      if (state === "ready") {
        done = false;
        state = "ready";

        setState("info", "Ready to start countdown");
      } else if (state === "started") {
        done = false;
        state = "started";

        const end = moment(data.started)
          .local()
          .add(timeInMillis, "ms");

        const now = moment().local();

        if (now >= end) {
          done = true;
          setState("danger", "Clear countdown");
          return;
        }

        const remainder = end - now;
        const delay = remainder % 100;

        setTimeout(() => {
          countdownId = setInterval(() => {
            let remainingTime = end - moment().local();

            if (remainingTime <= 0) {
              clearInterval(countdownId);
              done = true;
              setState("danger", "Clear countdown");
              return;
            }

            let time = remainingTime;
            const frac = parseInt((time / 100) % 10);
            time = parseInt(time / 1000);
            const seconds = time % 60;
            time = parseInt(time / 60);
            const minutes = time % 60;
            time = parseInt(time / 60);
            const hours = time;

            $("#countdown")
              .text(`Remaining time: ${hours}:${minutes}:${seconds}.${frac} (press to reset)`);
          }, 100);

          setState("warning", "");
        }, delay);
      } else if (state === "done") {
        done = true;
        setState("danger", "Clear countdown");
      }
    } else {
      state = undefined;
      $("#countdown").hide();
      $("input").val("");
    }
  });


  function updateTime(time) {
    for (let i = data.length - 1; i >= 0; i--) {
      const divisor = i === 0 ? time + 1: data[i - 1][1];
      const value = time % divisor;

      $("#" + data[i]).val(value);
      time = parseInt(time / divisor);
    }
  }

  function alertTimeout(target, text) {
    $(".alert").hide();
    $("#" + target).text(text).show();
    listenerId = setTimeout(function() {
      $("#" + target).hide();
    }, 4000);
  }

  socket.on("err", mesg => {
    clearTimeout(listenerId);
    alertTimeout("error", mesg);
  });

  function update() {
    $(".alert").hide();
    clearTimeout(listenerId);

    let time = 0;

    for (const [selector, count] of data) {
      const value = parseFloat($("#" + selector).val());
      const absoluteValue = isNaN(value) ? 0 : Math.abs(value);
      time = (time + absoluteValue) * count;
    }

    if (time === 0)  {
      alertTimeout("error", "Cannot have a countdown of 0 seconds");
    } else {
      socket.emit("set timer", time);
    }
  }

  $("#submit").on("click", update);
  $("input").keydown(function(evt) {
    if (evt.which === 13) update();
  })
});