$(function() {
  const THRESHOLD = 400;

  function toggle(className) {
    return $("#button").prop("class", "btn btn-large btn-block big " + className);
  }

  const socket = io.connect("/button");
  let countdownId = 0,
    end = undefined,
    pressed = false,
    remainingTime = 0,
    state = undefined;

  $("#button").on("click", () => {
    if (pressed) return;

    if (state === "done") {      
      const time = moment().
        local().
        add(Math.max(remainingTime, 0), "ms")
        .format("Y-MM-DDTHH:mm:ss.SSSSZZ");

      if (remainingTime <= 0) {
        socket.emit("submit", time);
      } else {
        setTimeout(() => {
          socket.emit("submit", time);
        }, remainingTime);
      }
    }
  });

  socket.on("submit", data => {
    if (data === "OK") {
      pressed = true;
      toggle("btn-info")
        .text("You have already pressed me");
    }
  });
  
  socket.on("time", data => {
    clearInterval(countdownId);
    pressed = false;

    if (data) {
      if (data.pushed) {
        pressed = true;
        toggle("btn-info")
          .text("You have already pressed me");
        return;
      }

      state = data.status;

      if (state === "done") {
        toggle("btn-success")
          .text("Press!");
      } else if (state === "started") {
        const timeInMillis = parseInt(data.length);

        end = moment(data.started)
          .local()
          .add(timeInMillis, "ms");

        const now = moment().local();

        if (now - end >= THRESHOLD) {
          state = "done";
        }

        const remainder = end - now;
        const delay = remainder % 100;

        setTimeout(() => {
          countdownId = setInterval(() => {
            remainingTime = end - moment().local();

            if (remainingTime <= 0) {
              state = "done";
              clearInterval(countdownId);
              toggle("btn-success")
                .text("Press!");
              return;
            }

            if (remainingTime < THRESHOLD) {
              state = "done";
            }

            let time = remainingTime;
            const frac = parseInt((time / 100) % 10);
            time = parseInt(time / 1000);
            const seconds = time % 60;
            time = parseInt(time / 60);
            const minutes = time % 60;
            time = parseInt(time /60);
            const hours = time;

            $("#button")
              .text(`Remaining time: ${hours}:${minutes}:${seconds}.${frac}`);
          }, 100);
        }, delay);

        toggle("btn-danger");
      } else if (state === "ready") {
        toggle("btn-warning")
          .text("Something exciting is coming.....")
      } else {
        toggle()
          .text("Nothing to see here.....");
      }
    } else {
      toggle()
        .text("Nothing to see here.....");
    }
  });
});