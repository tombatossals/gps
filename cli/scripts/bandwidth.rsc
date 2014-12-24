# Adding certificates to stablish API-SSL connections
:foreach c in=[/certificate find name="gps-ca-template"] do={/certificate remove $c;}
:foreach c in=[/certificate find name="gps-server-template"] do={/certificate remove $c;}
/certificate add name=gps-ca-template common-name=gps-ca key-usage=key-cert-sign,crl-sign
/certificate add name=gps-server-template common-name=gps-server
/certificate sign gps-ca-template
/certificate sign gps-server-template ca=gps-ca

/ip service enable api-ssl
/ip service set api-ssl certificate=gps-server-template

# Add the bandwidth Script
:foreach a in=[/system script find name="bandwidth"] do={/system script remove bandwidth;}
/system script
add name=bandwidth policy=\
    read,test source=":local \
    ttx\
    \n:local rrx\
    \n:set ttx 0\
    \n:set rrx 0\
    \n:global ip\
    \n:global username\
    \n:global password\
    \n:global interval\
    \n:global duration\
    \n:global proto\
    \n/tool bandwidth-test \$ip user=\$username password=\$password protocol=\
    \$proto \\\
    \n    direction=transmit interval=\$interval duration=\$duration do={ \
    \n    :if (\$status=\"running\") do={\
    \n      :set ttx \$\"tx-total-average\" \
    \n    }\
    \n}\
    \n/tool bandwidth-test \$ip user=\$username password=\$password protocol=\
    \$proto \\\
    \n    direction=receive interval=\$interval duration=\$duration do={ \
    \n    :if (\$status=\"running\") do={\
    \n      :set rrx \$\"rx-total-average\" \
    \n    }\
    \n}\
    \n:put (\"tx:\". \$ttx . \" rx:\" . \$rrx )\
    \n"
