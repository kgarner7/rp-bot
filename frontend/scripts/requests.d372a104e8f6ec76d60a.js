(window.webpackJsonp=window.webpackJsonp||[]).push([[11],{251:function(e,t,n){var r=n(253);e.exports=function(e){if(r(e))throw TypeError("The method doesn't accept regular expressions");return e}},252:function(e,t,n){var r=n(5)("match");e.exports=function(e){var t=/./;try{"/./"[e](t)}catch(n){try{return t[r]=!1,"/./"[e](t)}catch(e){}}return!1}},253:function(e,t,n){var r=n(7),a=n(20),o=n(5)("match");e.exports=function(e){var t;return r(e)&&(void 0!==(t=e[o])?!!t:"RegExp"==a(e))}},254:function(e,t,n){"use strict";var r=n(6),a=n(22),o=n(15),i=n(4),s=n(134),c=[],l=c.sort,u=i((function(){c.sort(void 0)})),p=i((function(){c.sort(null)})),d=s("sort");r({target:"Array",proto:!0,forced:u||!p||!d},{sort:function(e){return void 0===e?l.call(o(this)):l.call(o(this),a(e))}})},255:function(e,t,n){"use strict";var r=n(0),a=n.n(r),o=a.a.memo((function(e){var t,n="".concat(e.id,"Modal");return t="string"==typeof e.body&&e.html?a.a.createElement("div",{dangerouslySetInnerHTML:{__html:e.body}}):e.body,a.a.createElement("div",{className:"modal fade",id:n,tabIndex:-1,role:"dialog"},a.a.createElement("div",{className:"modal-dialog modal-dialog-centered modal-xl",role:"document"},a.a.createElement("div",{className:"modal-content"},a.a.createElement("div",{className:"modal-header"},a.a.createElement("h5",{className:"modal-title",id:"".concat(n,"Label")},e.title),a.a.createElement("button",{type:"button",className:"close","data-dismiss":"modal"},a.a.createElement("span",{"aria-hidden":"true"},"×"))),a.a.createElement("div",{className:"modal-body"},t),a.a.createElement("div",{className:"modal-footer"},a.a.createElement("button",{type:"button",className:"btn btn-secondary","data-dismiss":"modal"},"Close")))))}));t.a=o},256:function(e,t,n){"use strict";var r,a=n(6),o=n(21).f,i=n(18),s=n(251),c=n(62),l=n(252),u=n(26),p="".startsWith,d=Math.min,f=l("startsWith");a({target:"String",proto:!0,forced:!!(u||f||(r=o(String.prototype,"startsWith"),!r||r.writable))&&!f},{startsWith:function(e){var t=String(c(this));s(e);var n=i(d(arguments.length>1?arguments[1]:void 0,t.length)),r=String(e);return p?p.call(t,r,n):t.slice(n,n+r.length)===r}})},257:function(e,t,n){"use strict";n(38),n(53),n(54),n(86),n(85),n(39),n(84),n(87),n(55),n(56),n(57),n(58),n(59),n(60),n(61);var r=n(0),a=n.n(r);function o(e){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function i(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if("undefined"==typeof Symbol||!(Symbol.iterator in Object(e)))return;var n=[],r=!0,a=!1,o=void 0;try{for(var i,s=e[Symbol.iterator]();!(r=(i=s.next()).done)&&(n.push(i.value),!t||n.length!==t);r=!0);}catch(e){a=!0,o=e}finally{try{r||null==s.return||s.return()}finally{if(a)throw o}}return n}(e,t)||function(e,t){if(!e)return;if("string"==typeof e)return s(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);"Object"===n&&e.constructor&&(n=e.constructor.name);if("Map"===n||"Set"===n)return Array.from(e);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return s(e,t)}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function s(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function c(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function l(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function u(e,t){return(u=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function p(e){var t=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(e){return!1}}();return function(){var n,r=f(e);if(t){var a=f(this).constructor;n=Reflect.construct(r,arguments,a)}else n=r.apply(this,arguments);return d(this,n)}}function d(e,t){return!t||"object"!==o(t)&&"function"!=typeof t?function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e):t}function f(e){return(f=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var m=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&u(e,t)}(s,e);var t,n,r,o=p(s);function s(){return c(this,s),o.apply(this,arguments)}return t=s,(n=[{key:"render",value:function(){var e=this,t=!0,n=this.props.options.map((function(n){var r,o=i(n,2),s=o[0],c=o[1],l="btn btn-primary".concat(t?" active":"");return r=e.props.handleSort?a.a.createElement("label",{key:s,className:l,onClick:function(){return e.props.handleSort(s)}},a.a.createElement("input",{type:"radio",name:e.props.name,id:s}),c):a.a.createElement("label",{key:s,className:l},a.a.createElement("input",{type:"radio",name:e.props.name,id:s}),c),t=!1,r}));return a.a.createElement("div",{className:"input-group col-12"},a.a.createElement("input",{type:"text",className:"form-control",placeholder:this.props.placeholder,value:this.props.filter,onChange:this.props.handleFilter}),a.a.createElement("div",{className:"input-group-append btn-group btn-group-toggle","data-toggle":"buttons"},n))}}])&&l(t.prototype,n),r&&l(t,r),s}(a.a.PureComponent);t.a=m},259:function(e,t,n){var r=n(6),a=n(260);r({target:"Object",stat:!0,forced:Object.assign!==a},{assign:a})},260:function(e,t,n){"use strict";var r=n(8),a=n(4),o=n(40),i=n(89),s=n(63),c=n(15),l=n(88),u=Object.assign,p=Object.defineProperty;e.exports=!u||a((function(){if(r&&1!==u({b:1},u(p({},"a",{enumerable:!0,get:function(){p(this,"b",{value:3,enumerable:!1})}}),{b:2})).b)return!0;var e={},t={},n=Symbol();return e[n]=7,"abcdefghijklmnopqrst".split("").forEach((function(e){t[e]=e})),7!=u({},e)[n]||"abcdefghijklmnopqrst"!=o(u({},t)).join("")}))?function(e,t){for(var n=c(e),a=arguments.length,u=1,p=i.f,d=s.f;a>u;)for(var f,m=l(arguments[u++]),h=p?o(m).concat(p(m)):o(m),y=h.length,v=0;y>v;)f=h[v++],r&&!d.call(m,f)||(n[f]=m[f]);return n}:u},263:function(e,t,n){"use strict";var r=n(6),a=n(139).includes,o=n(136);r({target:"Array",proto:!0,forced:!n(27)("indexOf",{ACCESSORS:!0,1:0})},{includes:function(e){return a(this,e,arguments.length>1?arguments[1]:void 0)}}),o("includes")},264:function(e,t,n){"use strict";var r=n(6),a=n(251),o=n(62);r({target:"String",proto:!0,forced:!n(252)("includes")},{includes:function(e){return!!~String(o(this)).indexOf(a(e),arguments.length>1?arguments[1]:void 0)}})},298:function(e,t,n){"use strict";n.r(t),n.d(t,"Requests",(function(){return q}));n(38),n(53),n(54),n(135),n(86),n(85),n(263),n(39),n(84),n(87),n(254),n(55),n(259),n(56),n(57),n(58),n(59),n(264),n(60),n(256),n(61);var r=n(0),a=n.n(r),o=n(1);var i,s=n(255),c=n(257),l=n(2),u=a.a.memo((function(e){var t="Request ".concat(e.i,": ").concat(e.q," ").concat(e.n," ");if(e.u&&(t+="by ".concat(e.u," ")),e.v)switch(e.s){case 1:t+="(accepted)";break;case 2:t+="(denied)";break;default:t+="(pending)"}return a.a.createElement("div",{className:"card"},a.a.createElement("div",{className:"card-body"},a.a.createElement("h5",{className:"card-title"},t),a.a.createElement("button",{type:"button",className:"close",onClick:function(){return e.toggle(e.i)}},a.a.createElement("span",null,"^")),a.a.createElement("p",{className:"card-text"},e.r,e.d)))}));function p(e){return(p="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function d(){return(d=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(this,arguments)}function f(e,t){var n;if("undefined"==typeof Symbol||null==e[Symbol.iterator]){if(Array.isArray(e)||(n=function(e,t){if(!e)return;if("string"==typeof e)return m(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);"Object"===n&&e.constructor&&(n=e.constructor.name);if("Map"===n||"Set"===n)return Array.from(e);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return m(e,t)}(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,a=function(){};return{s:a,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:a}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,i=!0,s=!1;return{s:function(){n=e[Symbol.iterator]()},n:function(){var e=n.next();return i=e.done,e},e:function(e){s=!0,o=e},f:function(){try{i||null==n.return||n.return()}finally{if(s)throw o}}}}function m(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function h(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function y(e,t){return(y=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function v(e){var t=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(e){return!1}}();return function(){var n,r=E(e);if(t){var a=E(this).constructor;n=Reflect.construct(r,arguments,a)}else n=r.apply(this,arguments);return b(this,n)}}function b(e,t){return!t||"object"!==p(t)&&"function"!=typeof t?g(e):t}function g(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function E(e){return(E=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}!function(e){e.ALL="",e.PENDING="p",e.ACCEPTED="a",e.DENIED="d"}(i||(i={}));var N=[[i.PENDING,"pending"],[i.ACCEPTED,"accepted"],[i.DENIED,"denied"],[i.ALL,"all"]],q=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&y(e,t)}(m,e);var t,n,r,p=v(m);function m(e){var t;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,m),(t=p.call(this,e)).state={filter:"",sort:i.PENDING},t.denyChange=t.denyChange.bind(g(t)),t.handleApprove=t.handleApprove.bind(g(t)),t.handleChange=t.handleChange.bind(g(t)),t.handleCreate=t.handleCreate.bind(g(t)),t.handleDeny=t.handleDeny.bind(g(t)),t.handleFilter=t.handleFilter.bind(g(t)),t.handleSort=t.handleSort.bind(g(t)),t.toggle=t.toggle.bind(g(t)),t.toggleNew=t.toggleNew.bind(g(t)),t}return t=m,(n=[{key:"componentDidUpdate",value:function(e){if(this.state.activeReq&&e!==this.props){var t,n=f(this.props.requests);try{for(n.s();!(t=n.n()).done;){var r=t.value;r.i===this.state.activeReq&&0!==r.s&&($("#requestsModal").modal("hide"),this.setState({activeReq:void 0}))}}catch(e){n.e(e)}finally{n.f()}}else if(this.state.name&&this.state.description&&this.state.quantity&&this.props.requests.length>e.requests.length)for(var a=this.props.requests.length-1;a>=0;a--){var o=this.props.requests[a];if(o.d===this.state.description&&o.n===this.state.name&&o.q===this.state.quantity){$("#newRequestModal").modal("hide");break}}}},{key:"render",value:function(){var e,t=this,n=this.props.selected?"visible":"invisible",r=this.state.filter,o=this.props.requests.filter((function(n){var a,o=!0;if(""!==r&&(t.props.admin&&r.startsWith("u:")?o=(n.u||"").startsWith(r.substring(2)):(a=r,o=isNaN(a)||parseInt(a)!=a||isNaN(parseInt(a,10))?n.n.includes(r):n.i.toString(10).includes(r))),o)switch(t.state.sort){case i.PENDING:o=0===n.s;break;case i.ACCEPTED:o=1===n.s;break;case i.DENIED:o=2===n.s}return o&&t.state.activeReq===n.i&&(e=n),o})).sort((function(e,t){return Object(l.d)(e.i,t.i,-1)})).map((function(e){return a.a.createElement(u,d({key:e.i,toggle:t.toggle,v:t.state.sort===i.ALL},e))})),p="Request id or item name";this.props.admin&&(p+=" or u: for username");var f="",m="";if(e){var h,y=new Date(e.c).toLocaleString("en-US");switch(m="Request ".concat(e.i,": ").concat(e.q," ").concat(e.n," (").concat(y,")"),e.s){case 1:h="accepted";break;case 2:h="denied";break;default:h="pending"}f=this.props.admin&&0===e.s?a.a.createElement(a.a.Fragment,null,a.a.createElement("h4",null,"This request is ",a.a.createElement("strong",null,h)),a.a.createElement("div",{className:"input-group mt-3"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("span",{className:"input-group-text"},"Quantity override")),a.a.createElement("input",{className:"form-control",onChange:this.handleChange,name:"q",placeholder:"quantity",type:"number",min:1,value:this.state.quantity||e.q})),a.a.createElement("div",{className:"input-group mt-3"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("span",{className:"input-group-text"},"Description override")),a.a.createElement("textarea",{className:"form-control",name:"d",onChange:this.handleChange,value:this.state.description||e.d,placeholder:"description"})),a.a.createElement("div",{className:"input-group mt-3"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("button",{className:"btn btn-outline-success",type:"button",onClick:this.handleApprove},"Approve"),a.a.createElement("button",{className:"btn btn-outline-danger",type:"button",disabled:!this.state.deny,onClick:this.handleDeny},"Deny")),a.a.createElement("input",{type:"text",className:"form-control",placeholder:"Reason for denying",value:this.state.deny,onChange:this.denyChange}))):a.a.createElement(a.a.Fragment,null,a.a.createElement("h4",null,"This request is ",a.a.createElement("strong",null,h)),a.a.createElement("div",null,e.d))}var v=this.state.description&&this.state.name&&void 0!==this.state.quantity&&this.state.quantity>0;return a.a.createElement("div",{className:n},a.a.createElement("div",{className:"col-12"},a.a.createElement("button",{type:"button",className:"col-12 btn btn-primary mb-3",onClick:this.toggleNew},"Request an item!")),a.a.createElement(c.a,{filter:this.state.filter,name:"requests",options:N,placeholder:p,handleFilter:this.handleFilter,handleSort:this.handleSort}),a.a.createElement(s.a,{body:f,id:"requests",title:m}),a.a.createElement(s.a,{body:a.a.createElement(a.a.Fragment,null,a.a.createElement("div",{className:"input-group mb-4"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("span",{className:"input-group-text"},"Name and quantity")),a.a.createElement("input",{className:"form-control",onChange:this.handleChange,name:"n",placeholder:"name",type:"text",value:this.state.name}),a.a.createElement("input",{className:"form-control",onChange:this.handleChange,name:"q",placeholder:"quantity",type:"number",min:1,value:this.state.quantity})),a.a.createElement("div",{className:"input-group mb-4"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("span",{className:"input-group-text"},"Description")),a.a.createElement("textarea",{className:"form-control",name:"d",onChange:this.handleChange,value:this.state.description,placeholder:"description"})),a.a.createElement("button",{type:"button",className:"btn-success btn col-12",disabled:!v,onClick:this.handleCreate},"Create request!")),id:"newRequest",title:"New item!"}),a.a.createElement("div",{className:"card-columns col-12 mt-2"},o))}},{key:"denyChange",value:function(e){this.setState({deny:e.target.value})}},{key:"handleApprove",value:function(){if(this.state.activeReq&&confirm("Are you sure you want to approve this request?")){var e={a:!0,i:this.state.activeReq};this.state.description&&(e.d=this.state.description),this.state.quantity&&(e.q=this.state.quantity),this.props.socket.emit(o.l,e)}}},{key:"handleDeny",value:function(){if(this.state.activeReq){if(!this.state.deny)return void alert("You must provide a reason for rejecting this request");if(confirm("Are you sure you want to deny this request?")){var e={a:!1,i:this.state.activeReq,r:this.state.deny};this.props.socket.emit(o.l,e)}}}},{key:"handleChange",value:function(e){switch(e.target.name){case"d":this.setState({description:e.target.value});break;case"q":this.setState({quantity:e.target.valueAsNumber});break;case"n":this.setState({name:e.target.value})}}},{key:"handleCreate",value:function(){if(this.state.description&&this.state.name&&void 0!==this.state.quantity&&this.state.quantity>0){var e={d:this.state.description,n:this.state.name,q:this.state.quantity};this.props.socket.emit(o.m,e)}}},{key:"handleFilter",value:function(e){this.setState({filter:e.target.value})}},{key:"handleSort",value:function(e){this.setState({sort:e})}},{key:"toggle",value:function(e){this.setState({activeReq:e,deny:"",description:void 0,quantity:void 0}),$("#requestsModal").modal("show")}},{key:"toggleNew",value:function(){this.setState({description:"",name:"",quantity:1}),$("#newRequestModal").modal("show")}}])&&h(t.prototype,n),r&&h(t,r),m}(a.a.PureComponent);t.default=q}}]);