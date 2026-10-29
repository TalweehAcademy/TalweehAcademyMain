// Cloudflare Web Analytics (no cookies): loads its beacon only on the real site (talweehacademy.com and its
// subdomains, e.g. beta), so local and preview builds are not counted. Page changes inside the app are counted
// by the beacon itself. The token is public by design (it is in every page anyway).
(function () {
  var host = location.hostname
  if (host !== 'talweehacademy.com' && !/\.talweehacademy\.com$/.test(host)) return
  var s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.setAttribute('data-cf-beacon', '{"token": "da68ae4b46134134b73d926e8b1b3b08"}')
  document.head.appendChild(s)
})()
