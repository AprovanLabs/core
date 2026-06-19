ls | xargs -I % sh -c '(cd $1 && echo "Pulling $1..." && git pull)' sh %
