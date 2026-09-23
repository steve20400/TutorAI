-- L'adresse à laquelle on conteste une désactivation.
--
-- Un compte désactivé reçoit aujourd'hui « ce compte a été désactivé » et
-- rien d'autre : ni le motif, ni où écrire. Pour un répétiteur écarté à tort,
-- c'est une porte fermée sans sonnette — et pour la plateforme, un litige qui
-- se règlera ailleurs que chez elle.
--
-- L'adresse vit en base et non dans le code : elle changera le jour où une
-- vraie boîte de contact existera, et ce jour-là il ne faudra pas redéployer.
--
-- Publique, comme le fond de carte : elle est destinée à être lue par ceux
-- qu'on refuse. La cacher n'aurait aucun sens.
insert into cles_api (nom, valeur, publique, apercu)
values ('contact_administration', 'steveaurelmanfo@gmail.com', true,
        'steveaurelmanfo@gmail.com')
on conflict (nom) do update
  set valeur = excluded.valeur,
      apercu = excluded.apercu,
      publique = true;
