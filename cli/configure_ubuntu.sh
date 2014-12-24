#! /bin/bash

#Necesita: sshpass

instalat=$(dpkg-query -l | grep sshpass | wc -l)
if [ "$instalat" = "0"  ]; then
	echo  "Error: es requereix tenir instal·lat sshpass"
	echo "El podeu instal·lar amb: sudo apt-get install sshpass"
	exit
fi

#Parametres de configuracio

#Usuari utilitzat per GPS
gpsu="gps"

#Grup usat per GPS
gpsg="gps"

#Contrasenya de l'usuari GPS
gpsp="bmXUegSFG9yFih4T"

#Port del servei SSH als routers
port="222"

#Funció per validar IP
# Verify that the parameter passed is an IP Address:
function is_IP() {
if [ `echo $1 | grep -o '\.' | wc -l` -ne 3 ]; then
        echo "1";
	exit 1;
elif [ `echo $1 | tr '.' ' ' | wc -w` -ne 4 ]; then
        echo "1"; 
	exit 1;
else
        for OCTET in `echo $1 | tr '.' ' '`; do
                if ! [[ $OCTET =~ ^[0-9]+$ ]]; then
                        echo "1";
			exit 1;
                elif [[ $OCTET -lt 0 || $OCTET -gt 255 ]]; then
                        echo "1";
			exit 1;
                fi
        done
fi
echo "0";
return 0;
}
#Comprovar que $1 no estigui buit
if [ -z "$1" ]; then
echo  "Per afegir un node i configurar el router: ./configure.sh IP_del_router"
exit
fi
#Comprovar format de la IP

ipvalida=$(is_IP "$1")
if [ "$ipvalida" = "1"  ]; then
echo  "Error: format invalid de la IP"
exit
fi


#Principi bucle per demanar configuració. Demana la configuració fins que contestem que és correcta
until [ "$pregunta" = "s" ]; do

	#Demanar nom del Supernode
	while read -p "Nom del supernode? " node && [[ -z "$node" ]] ; do
	 echo "El nom del Supernode no pot estar en blanc!"
	done

	#Demanar latitud
	while read -p "Latitud? " lat && [[ "$valid" != "$lat" ]] ; do
        	valid=$(echo "$lat" | grep '^[0-9]*\.[0-9]*')
	        if [ "$valid" != "$lat" ]; then
        	        echo "Valor invalid!"
	        else
        	        break
	        fi
	done

        #Demanar longitud
        while read -p "Longitud? " lon && [[ "$valid" != "$lon" ]] ; do
                valid=$(echo "$lon" | grep '^[0-9]*\.[0-9]*')
                if [ "$valid" != "$lon" ]; then
                        echo "Valor invalid!"
                else
                        break
                fi
        done


	#Demanar usuari administrador
	while read -p "Usuari administrador del router? " user && [[ -z "$user" ]] ; do
	 echo "Usuari  administrador no pot estar en blanc!"
	done

	#Demanar contrasenya
	while read -s -p "Contrasneya del usuari administrador del router?" pass && [[ -z "$pass" ]] ; do
	 echo "La contrasenya no pot estar en blanc!"
	done

	#Mostrar resum de la configuració de xarxa
	clear
	echo "Resum de la configuració:"
	echo " "
	echo "IP: $1"
	echo "Usuari administrador: $user"
	echo "Node: $node"
	echo "Latitud: $lat"
	echo "Longitud: $lon"
	echo " "

#Final bcucle per demanar configuració. Si contesta no torna a demanar la configuració
read -p "És correcta aquesta configuració? s/n/q: " pregunta
if [ $pregunta = "q" ]; then exit; fi
done

#Configurar router
IP_ADDRESS="$1"

log_file="configure.log"

	#Afegir usuari i grup GPS
	sshpass -p $pass ssh -o StrictHostKeyChecking=no -p $port "$user@$IP_ADDRESS" ":foreach a in=[/user find name=\"$gpsu\"] do={/user remove $gpsu;};:foreach a in=[/user group find name=\"$gpsg\"] do={/user group remove $gpsg;};/user group add name=$gpsg policy=\"ssh,read,test,winbox,api,!local,!telnet,!ftp,!reboot,!write,!policy,!password,!web,!sniff,!sensitive\";/user add name=$gpsu group=$gpsg password=$gpsp"; rc=$?;
	echo "$IP_ADDRESS User configuration finished (with exit code ${rc}): $(date --iso-8601=seconds)" >>"$log_file" 
	if [ "$rc" -ne "0" ]; then
		echo "Error al afegir usuari i el grup"
		exit
	fi

	#Copiar script
	sshpass -p $pass scp -o StrictHostKeyChecking=no -P $port scripts/bandwidth.rsc "$user@$IP_ADDRESS:./"; rc=$?;
	echo "$IP_ADDRESS Script file transfer finished (with exit code ${rc}): $(date --iso-8601=seconds)" >>"$log_file" 
	if [ "$rc" -ne "0" ]; then
                echo "Error al transferir script"
                exit
        fi

	#Importar script
	sshpass -p $pass ssh -o StrictHostKeyChecking=no -p $port "$user@$IP_ADDRESS" "/import file-name=bandwidth.rsc;/file remove bandwidth.rsc"; rc=$?;
        echo "$IP_ADDRESS User configuration finished (with exit code ${rc}): $(date --iso-8601=seconds)" >>"$log_file"
	if [ "$rc" -ne "0" ]; then
                echo "Error al importar script"
                exit
        fi


#Crear Fitxer de ocnfiguracio .json

echo "{" >"$node.json"
echo "\"name\": \"$node\"," >>"$node.json"
echo "\"system\": \"mikrotik\"," >>"$node.json"
echo "\"mainip\": \"$IP_ADDRESS\"," >>"$node.json"
echo "\"username\": \"$gpsu\"," >>"$node.json"
echo "\"password\": \"$gpsp\","  >>"$node.json"
echo "\"latlng\": {" >>"$node.json"
echo "        \"lat\": $lat," >>"$node.json"
echo "        \"lng\": $lon" >>"$node.json"
echo "   }" >>"$node.json"
echo "}" >>"$node.json"

#Afegir node a GPS

./manage.js add node "$node.json"

#Eliminar fitxer de configuracio .json

rm "$node.json"
