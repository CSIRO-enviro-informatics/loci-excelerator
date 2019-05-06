import popper from "popper.js";
global.Popper = popper;

import '@fortawesome/fontawesome-free/css/all.css'
// window.FontAwesomeConfig = { autoReplaceSvg: false }
import "startbootstrap-sb-admin-2/vendor/bootstrap/js/bootstrap.bundle.min.js"
import "startbootstrap-sb-admin-2/vendor/jquery-easing/jquery.easing.min.js"
import "startbootstrap-sb-admin-2/js/sb-admin-2.js"

// Client entry point, imports all client code

import '/imports/startup/client';
import '/imports/startup/both';
