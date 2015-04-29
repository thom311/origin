#!/bin/bash
set -ex
source $(dirname $0)/provision-config.sh

pushd $HOME
# build openshift-sdn
if [ -d openshift-sdn ]; then
    cd openshift-sdn
    git fetch origin
    git checkout sdn_no_lbr
    git reset --hard origin/sdn_no_lbr
    rm -f ovs-simple/bin/osdn-dhclient-script
else
    git clone https://github.com/rajatchopra/openshift-sdn.git
    cd openshift-sdn
    git checkout sdn_no_lbr
fi

make clean
make
make install
popd

# Create systemd service
cat <<EOF > /usr/lib/systemd/system/openshift-master-sdn.service
[Unit]
Description=OpenShift SDN Master
Requires=openshift-master.service
After=openshift-master.service

[Service]
ExecStart=/usr/bin/openshift-sdn -etcd-endpoints=https://${MASTER_IP}:4001 -etcd-keyfile=${ETCD_KEYFILE} -etcd-certfile=${ETCD_CERTFILE} -etcd-cafile=${ETCD_CAFILE}

[Install]
WantedBy=multi-user.target
EOF

# Start the service
systemctl daemon-reload
systemctl start openshift-master-sdn.service
