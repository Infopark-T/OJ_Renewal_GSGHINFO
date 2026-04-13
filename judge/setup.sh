set -xe

# Hustoj basic file system
useradd -m -u 1536 judge
mkdir -p /home/judge/etc
mkdir -p /home/judge/data
mv /judge/src /home/judge/src
chmod -R 700 /home/judge/etc
chown -R www-data:www-data /home/judge/data

# Judge daemon and client
make      -C /home/judge/src/core/judged
make      -C /home/judge/src/core/judge_client
make exes -C /home/judge/src/core/sim/sim_3_01 || echo "sim build failed, skipping"
cp /home/judge/src/core/judged/judged                /usr/bin/judged
cp /home/judge/src/core/judge_client/judge_client    /usr/bin/judge_client
cp /home/judge/src/core/sim/sim_3_01/sim_c.exe       /usr/bin/sim_c   2>/dev/null || true
cp /home/judge/src/core/sim/sim_3_01/sim_c++.exe     /usr/bin/sim_cc  2>/dev/null || true
cp /home/judge/src/core/sim/sim_3_01/sim_java.exe    /usr/bin/sim_java 2>/dev/null || true
cp /home/judge/src/core/sim/sim.sh                   /usr/bin/sim.sh  2>/dev/null || true
cp /home/judge/src/install/hustoj                    /etc/init.d/hustoj
chmod +x /usr/bin/judged
chmod +x /usr/bin/judge_client
chmod +x /usr/bin/sim_c
chmod +x /usr/bin/sim_cc
chmod +x /usr/bin/sim_java
chmod +x /usr/bin/sim.sh

# Adjust system configuration
cp /home/judge/src/install/java0.policy  /home/judge/etc/
cp /home/judge/src/install/judge.conf    /home/judge/etc/
sed -i "s#OJ_COMPILE_CHROOT=1#OJ_COMPILE_CHROOT=0#g"     /home/judge/etc/judge.conf
sed -i "s#OJ_SHM_RUN=1#OJ_SHM_RUN=0#g"                   /home/judge/etc/judge.conf
