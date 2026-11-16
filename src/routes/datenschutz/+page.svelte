<script lang="ts">
  import Seo from '#lib/shell/Seo.svelte';
  import { analyticsConfig } from '#lib/config';
  import StatsSwitch from '#lib/shell/StatsSwitch.svelte';
  import Box from '#lib/ui/Box.svelte';
  // Sections 1 to 3 are the e-recht24 text, unchanged (see the comment above section 4).
  import erecht24 from './e-recht24.html?raw';
</script>

<Seo
  title="Datenschutzerklärung · IMG-TOOLS"
  description="Datenschutzerklärung von IMG-TOOLS: Ihre Bilder werden nicht hochgeladen, sondern in Ihrem Browser verarbeitet."
  path="/datenschutz/"
/>

<div class="page" lang="de">
  <Box>
    <article>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html erecht24}

      <!-- Section 4 is not part of the e-recht24 text: it replaces its sections on Google Fonts,
           Font Awesome and Cloudflare Turnstile, which this site does not use. Written for this
           site; not legally reviewed. -->
      <h2>4. Reichweitenmessung (Umami) und lokaler Speicher</h2>
      <h3>Umami</h3>
      {#if analyticsConfig.on}
        <p>
          Diese Website nutzt zur Reichweitenmessung <a
            href="https://umami.is"
            target="_blank"
            rel="noopener noreferrer">Umami</a
          > (Umami Cloud). Wir möchten damit erfahren, welche Werkzeuge dieser Website genutzt werden,
          um sie zu verbessern.
        </p>
        <p>
          Gezählt werden Seitenaufrufe und Ereignisse wie „convert-image:run“, also das Werkzeug und
          die Aktion (zum Beispiel Datei hinzugefügt, Umwandlung gestartet, Ergebnis geladen). Dazu
          können grobe Angaben kommen, etwa eine Mengenklasse der Dateien, das gewählte
          Ausgabeformat, die auf 5 gerundete Qualität, eine Dauerklasse oder ein Fehlercode. Nie
          übermittelt werden Ihre Bilder, Dateinamen, Dateiinhalte, Metadaten, Eingaben oder genaue
          Größen. Die Bilder werden ausschließlich in Ihrem Browser verarbeitet und nicht an einen
          Server gesendet.
        </p>
        <p>
          Umami setzt nach eigenen Angaben keine Cookies. Beim Aufruf des Skripts und beim Senden
          der Ereignisse erhält Umami technisch bedingt Ihre IP-Adresse und Angaben zu Ihrem
          Browser, wie jeder Server, den Ihr Browser kontaktiert. Die für diese Website verwendete
          Umami-Instanz wird auf Servern in der Europäischen Union betrieben (Serverstandort EU).
          Informationen zur Datenverarbeitung durch Umami finden Sie unter <a
            href="https://umami.is/privacy"
            target="_blank"
            rel="noopener noreferrer">https://umami.is/privacy</a
          >.
        </p>
        <p>
          Rechtsgrundlage ist unser berechtigtes Interesse an einer Statistik über die Nutzung
          unseres Angebots (Art. 6 Abs. 1 lit. f DSGVO).
          {#if analyticsConfig.mode === 'opt-out'}
            Die Zählung läuft, solange Ihr Browser nicht „Do Not Track“ oder „Global Privacy
            Control“ meldet. Meldet er eines der beiden Signale, wird nichts gesendet und das Skript
            von Umami wird gar nicht erst geladen. Sie können der Zählung außerdem jederzeit
            widersprechen (Art. 21 DSGVO), indem Sie sich an die in Abschnitt 3 genannte
            verantwortliche Stelle wenden, oder die Verbindung zu Umami in Ihrem Browser oder mit
            einem Inhaltsblocker sperren.
          {:else}
            Die Zählung ist ausgeschaltet, bis Sie sie hier einschalten. Ihre Einwilligung können
            Sie hier jederzeit widerrufen. Ebenso wird nichts gesendet, wenn Ihr Browser „Do Not
            Track“ oder „Global Privacy Control“ meldet.
          {/if}
        </p>
        {#if analyticsConfig.mode === 'opt-in'}<p><StatsSwitch /></p>{/if}
      {:else}
        <p>
          In dieser Fassung der Website findet keine Reichweitenmessung statt und es wird kein
          Dienst eines Dritten zur Analyse eingebunden.
        </p>
      {/if}
      <h3>Lokaler Speicher im Browser</h3>
      <p>
        Ihre angehefteten Werkzeuge, das gewählte Farbschema, der Zustand des Menüs{analyticsConfig.on &&
        analyticsConfig.mode === 'opt-in'
          ? ' und Ihre Entscheidung zur Reichweitenmessung'
          : ''} werden im lokalen Speicher Ihres Browsers abgelegt, damit die Seite sich beim nächsten
        Besuch so zeigt, wie Sie sie verlassen haben. Diese Angaben bleiben auf Ihrem Gerät, werden nicht
        an uns übermittelt und lassen sich in den Browsereinstellungen löschen. Cookies setzt diese Website
        nicht.
      </p>
      <p>
        Quelle der Abschnitte 1 bis 3: <a href="https://www.e-recht24.de"
          >https://www.e-recht24.de</a
        >
      </p>
      <p class="en">
        <a href="../privacy/" hreflang="en">English: how we know your images stay private</a>
      </p>
    </article>
  </Box>
</div>

<style>
  .page {
    max-width: 820px;
    margin: 0 auto;
    display: grid;
    gap: 16px;
  }
  article {
    max-width: 72ch;
    overflow-wrap: break-word;
    hyphens: manual;
  }
  article :global(h1) {
    margin: 0 0 16px;
  }
  article :global(h2) {
    margin: 28px 0 8px;
  }
  article :global(h3) {
    margin: 20px 0 6px;
    font-size: 1.125rem;
  }
  article :global(h4) {
    margin: 16px 0 4px;
    font-size: 1rem;
  }
  article :global(p),
  article :global(ul) {
    margin: 0 0 12px;
  }
  article :global(ul) {
    padding-left: 1.25em;
  }
  .en {
    margin-top: 20px;
  }
</style>
