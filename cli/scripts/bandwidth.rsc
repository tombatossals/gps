# Adding certificates to stablish API-SSL connections
:foreach c in=[/certificate find name="gps-ca-template"] do={/certificate remove $c;}
:foreach c in=[/certificate find name="gps-server-template"] do={/certificate remove $c;}
/certificate add name=gps-ca-template common-name=gps-ca key-usage=key-cert-sign,crl-sign
/certificate add name=gps-server-template common-name=gps-server
/certificate sign gps-ca-template
/certificate sign gps-server-template ca=gps-ca

/ip service enable api-ssl
/ip service set api-ssl certificate=gps-server-template
