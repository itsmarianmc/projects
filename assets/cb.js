document.getElementById('cookieAction').addEventListener('click', function() {
    document.getElementById('cookieBanner').style.display = 'none';
    localStorage.setItem('cookieAccepted', 'true');
});

window.addEventListener('DOMContentLoaded', function() {

    function isCookieAccepted() {
        return localStorage.getItem('cookieAccepted') === 'true';
    }

    if (isCookieAccepted()) {
        document.getElementById('cookieBanner').style.display = 'none';
        setTimeout(() => {
            console.log('[COOKIES] Cookies are accepted.');
        }, 100);
        
    } else {
        document.getElementById('cookieBanner').style.display = 'block';
        setTimeout(() => {
            console.log('[COOKIES] Cookies are not accepted.');
        }, 100);
    }
});