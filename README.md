# gps

Aplicación de registro, monitorización y visualización del estado de enlaces inalámbricos en una red ciudadana gestionada a través de [guifi.net](http://guifi.net).


## Instalación de las dependencias de software

Necesitamos instalar [git](http://git-scm.com), [nodeJS](http://nodejs.org], [collectd](http://collectd.org), y [MongoDB](http://mongodb.org) antes de continuar, dependiendo de tu sistema operativo esto deberá realizarse con el gestor de paquetes correspondiente.

Instalación en Ubuntu

```
$ sudo aptitude install collectd mongodb nodejs git
```

Instalación en Archlinxu

```
$ sudo pacman -S collectd mongodb nodejs git
```

## Instalación del proyecto GPS

Con una cuenta de usuario no privilegiado, clonaremos el repositorio git del proyecto e instalaremos las dependencias de NodeJS (npm) y de javascript cliente (bower).

* Clonado del repositorio
```
$ git clone https://github.com/tombatossals/gps.git
Cloning into 'gps'...
remote: Reusing existing pack: 928, done.
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 931 (delta 0), reused 0 (delta 0)
Receiving objects: 100% (931/931), 3.91 MiB | 646.00 KiB/s, done.
Resolving deltas: 100% (284/284), done.
Checking connectivity... done.
$
```

* Instalación de las dependencias NodeJS (dentro del directorio del proyecto)
```
$ npm update
```

* Instalación de las dependencias Bower (dentro del directorio del proyecto)
```
$ bower update
```
