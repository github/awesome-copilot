import gzip
import json
import math
import plistlib
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave
import zipfile
from pathlib import Path

from engine import Engine, analyze_wav, parse_rpp, parse_als, parse_studio_one, parse_cpr, parse_flp, pyflp, safe

def make_flp(path, tempo=120):
    def text_event(event_id, value): return bytes([event_id, len(value)]) + value
    body = text_event(199, b'20.8.4' + bytes([0])) + bytes([156]) + struct.pack('<I', int(tempo * 1000))
    body += text_event(231, ('Group' + chr(0)).encode('utf-16le'))
    body += bytes([64]) + struct.pack('<H', 0) + bytes([21, 0]) + bytes([145]) + struct.pack('<i', 0)
    body += text_event(192, ('Kick' + chr(0)).encode('utf-16le'))
    body += text_event(196, ('Media' + chr(92) + 'kick.wav' + chr(0)).encode('utf-16le'))
    data = b'FLhd' + struct.pack('<IHHH', 6, 0, 1, 96) + b'FLdt' + struct.pack('<I', len(body)) + body
    path.write_bytes(data)

RPP = '''<REAPER_PROJECT 0.1 7 1
TEMPO 120 4 4
MARKER 1 0 "Start" 0
<TRACK
  NAME "Drums"
  <ITEM
    POSITION 0
    LENGTH 0.25
    SOFFS 0
    <SOURCE WAVE
      FILE "Media/kick.wav"
    >
  >
>
>
'''

class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / 'Media').mkdir()
        self.wav = self.root / 'Media' / 'kick.wav'
        samples = [0, 32767, -32768, 0] * 500
        with wave.open(str(self.wav), 'wb') as w:
            w.setparams((1, 2, 8000, 0, 'NONE', 'NONE'))
            w.writeframes(struct.pack('<' + 'h'*len(samples), *samples))
        self.project = self.root / 'session.rpp'
        self.project.write_text(RPP, encoding='utf-8')
        self.e = Engine(self.root)
        self.e.scan()

    def tearDown(self):
        self.e.cache.close()
        self.tmp.cleanup()

    def test_rpp_tracks_regions_tempo_markers(self):
        parsed = parse_rpp(RPP.encode())
        self.assertEqual(parsed['tracks'][0]['name'], 'Drums')
        self.assertEqual(parsed['tempoBpm'], 120)
        self.assertEqual(len(parsed['markers']), 1)
        self.assertEqual(len(parsed['regions']), 1)
        self.assertEqual(parsed['regions'][0]['ref'], 0)

    def test_scan_and_safe_repair_backup(self):
        p = next(iter(self.e.projects.values()))
        self.assertEqual(p['tracks'][0]['name'], 'Drums')
        self.assertEqual(self.e.state['missing'], 0)
        # Change the reference to a non-existing Windows path, rescan, and repair from a selected candidate.
        self.project.write_text(RPP.replace('Media/kick.wav', 'K:\\old\\kick.wav'), encoding='utf-8')
        self.e.scan(); p = next(iter(self.e.projects.values())); original = self.project.read_bytes()
        selections = {'0': 'Media/kick.wav'}
        preflight = self.e.preflight(p['id'], 'repair', selections=selections)
        self.assertTrue(preflight['ready'], preflight['blockedReasons'])
        self.assertEqual(preflight['candidateValidation']['validated'], 1)
        result = self.e.repair(p['id'], p['hash'], selections, confirm=True)
        self.assertEqual((self.root / result['backup']).read_bytes(), original)
        self.assertTrue((self.root / (result['backup'] + '.manifest.json')).is_file())
        self.assertIn('Media/kick.wav', self.project.read_text())
        self.assertEqual(self.e.state['missing'], 0)
        self.assertEqual(result['pathChanges'][0]['oldPath'], 'K:\\old\\kick.wav')
        self.assertEqual(result['pathChanges'][0]['newPath'], 'Media/kick.wav')
        self.assertEqual(result['postOperationStatus']['status'], 'verified')
        self.assertEqual(result['postOperationStatus']['missingReferences'], 0)
        restore_check = self.e.preflight(p['id'], 'restore', backup=result['backup'])
        self.assertTrue(restore_check['ready'], restore_check['blockedReasons'])
        restored = self.e.restore_backup(result['backup'], 'session.rpp', confirm=True)
        self.assertTrue(restored['verified'])
        self.assertEqual(self.project.read_bytes(), original)
        backup_path = self.root / result['backup']
        backup_path.write_bytes(b'tampered backup')
        corrupt_check = self.e.preflight(p['id'], 'restore', backup=result['backup'])
        self.assertFalse(corrupt_check['ready'])
        self.assertTrue(any('integralności' in reason for reason in corrupt_check['blockedReasons']))

    def test_changed_project_is_refused(self):
        p = next(iter(self.e.projects.values()))
        self.project.write_text(RPP + '; edited after scan', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'zmienił się'):
            self.e.repair(p['id'], p['hash'], {'0': 'Media/kick.wav'}, confirm=True)

    def test_safe_hash_detects_same_size_edit_with_preserved_mtime(self):
        item = next(iter(self.e.projects.values()))
        stat = self.project.stat()
        changed = RPP.replace('Drums', 'drums')
        self.assertEqual(len(changed.encode()), self.project.stat().st_size)
        self.project.write_text(changed, encoding='utf-8')
        import os
        os.utime(self.project, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        with self.assertRaisesRegex(ValueError, 'zmienił się'):
            self.e.current(item['id'], item['hash'])

    def test_duplicate_sha_cache(self):
        (self.root / 'Samples').mkdir()
        (self.root / 'Samples' / 'copy.wav').write_bytes(self.wav.read_bytes())
        self.e.scan()
        groups = self.e.duplicates()
        self.assertEqual(len(groups), 1)
        self.assertEqual(len(groups[0]['files']), 2)
        self.assertEqual(groups[0]['size'], self.wav.stat().st_size)

    def test_portable_rpp_package(self):
        p = next(iter(self.e.projects.values()))
        result = self.e.export(p['id'], p['hash'], confirm=True)
        dest = self.root / result['destination']
        self.assertTrue((dest / 'Project.rpp').exists())
        self.assertEqual(len(list((dest / 'Media').iterdir())), 1)
        self.assertIn('tempoBpm', json.loads((dest / 'manifest.json').read_text()))

    def test_pcm_wav_analysis(self):
        report = analyze_wav(self.wav)
        self.assertEqual(report['sampleRate'], 8000)
        self.assertEqual(report['fullScaleSamples'], 1000)
        self.assertEqual(report['peakDbfs'], 0)
        self.assertEqual(len(report['envelope']), 2)

    def test_als_partial_gzip_xml(self):
        xml = b'''<Ableton><LiveSet><Tempo><Manual Value="123.0"/></Tempo><Tracks><AudioTrack><Name><EffectiveName Value="Bass"/></Name><Sample><FileRef><Path><RelativePath Value="Media/kick.wav"/></Path></FileRef></Sample><AudioClip><CurrentStart Value="0"/><CurrentEnd Value="2"/><Name><EffectiveName Value="Clip"/></Name></AudioClip></AudioTrack></Tracks><Locators><Locator><Name Value="Intro"/><Time Value="0"/></Locator></Locators></LiveSet></Ableton>'''
        result = parse_als(gzip.compress(xml))
        self.assertEqual(result['tempoBpm'], 123)
        self.assertEqual(result['tracks'][0]['name'], 'Bass')
        self.assertEqual(result['refs'][0]['path'], 'Media/kick.wav')
        self.assertTrue(result['regions'])
        self.assertTrue(result['markers'])

    def test_studio_one_zip_xml(self):
        song = self.root / 'demo.song'
        xml = b'''<Song tempo="120"><AudioTrack name="Percussion"><AudioEvent name="Kick" start="0" length="0.25"><File path="Media/kick.wav"/></AudioEvent></AudioTrack><Marker name="Start" position="0"/></Song>'''
        with zipfile.ZipFile(song, 'w') as z: z.writestr('document.xml', xml)
        result = parse_studio_one(song)
        self.assertEqual(result['tracks'][0]['name'], 'Percussion')
        self.assertEqual(result['refs'][0]['path'], 'Media/kick.wav')
        self.assertEqual(result['tempoBpm'], 120)
        self.assertTrue(result['regions'])

    def test_studio_one_tempo_copy_remains_read_only(self):
        song = self.root / 'tempo.song'
        xml = b'<?xml version="1.0"?><Song tempo="120"><AudioTrack name="Pads"/></Song>'
        with zipfile.ZipFile(song, 'w') as z: z.writestr('document.xml', xml)
        self.e.scan(); item = next(p for p in self.e.projects.values() if p['path'] == 'tempo.song')
        original = song.read_bytes()
        with self.assertRaisesRegex(ValueError, 'read-only'):
            self.e.save_song_tempo_copy(item['id'], item['hash'], 133.5)
        self.assertEqual(song.read_bytes(), original)

    def test_cpr_readable_xml_snapshot_only(self):
        parsed = parse_cpr(b'<Project><AudioTrack name="Vox"><File path="Media/kick.wav"/></AudioTrack></Project>')
        self.assertEqual(parsed['tracks'][0]['name'], 'Vox')
        self.assertTrue(parsed['cprXml'])
        opaque = parse_cpr(b'\x00\x01opaque binary cpr data')
        self.assertTrue(opaque['partial'])
        self.assertFalse(opaque['tracks'])

    def test_logicx_metadata_and_media(self):
        pkg = self.root / 'Song.logicx'; (pkg / 'Alternatives' / '000').mkdir(parents=True)
        with open(pkg / 'Alternatives' / '000' / 'MetaData.plist', 'wb') as f:
            plistlib.dump({'tempo': 120, 'timeSignature': [4, 4]}, f)
        (pkg / 'Alternatives' / '000' / 'ProjectData').write_bytes(b'\x23\x47\xc0\xab karT TestPlugin')
        (pkg / 'Media').mkdir(); (pkg / 'Media' / 'asset.wav').write_bytes(self.wav.read_bytes())
        self.e.scan(); logic = next(p for p in self.e.projects.values() if p['format'] == '.logicx')
        self.assertEqual(logic['tempoBpm'], 120)
        self.assertIn('Media/asset.wav', [r['path'] for r in logic['refs']])
        self.assertTrue(logic['partial'])

    def test_flp_parser_reads_binary_tempo_channel_and_media(self):
        flp = self.root / 'fixture.flp'; make_flp(flp)
        parsed = parse_flp(flp)
        self.assertEqual(parsed['tempoBpm'], 120)
        self.assertEqual(parsed['tracks'][0]['name'], 'Kick')
        self.assertEqual(parsed['refs'][0]['path'], r'Media\kick.wav')
        self.e.scan(); item = next(p for p in self.e.projects.values() if p['format'] == '.flp')
        self.assertTrue(item['refs'][0]['exists'])

    def test_flp_tempo_write_creates_verified_copy_only(self):
        flp = self.root / 'tempo.flp'; make_flp(flp)
        self.e.scan(); item = next(p for p in self.e.projects.values() if p['path'] == 'tempo.flp')
        original = flp.read_bytes()
        result = self.e.save_flp_tempo_copy(item['id'], item['hash'], 127.25, confirm=True)
        self.assertEqual(flp.read_bytes(), original)
        saved = self.root / result['destination']
        self.assertAlmostEqual(pyflp.parse(str(saved)).tempo, 127.25)
        self.assertTrue((self.root / result['destination']).exists())

    def test_smart_index_finds_renamed_exact_media(self):
        self.e.smart_index()
        moved = self.root / 'Samples' / 'renamed.wav'; moved.parent.mkdir(); self.wav.rename(moved)
        self.e.scan(); p = next(iter(self.e.projects.values()))
        self.assertFalse(p['refs'][0]['exists'])
        result = self.e.smart_resolve(p['id'])
        candidate = result['missing'][0]['candidates'][0]
        self.assertEqual(candidate['path'], 'Samples/renamed.wav')
        self.assertTrue(candidate['signals']['sha256Match'])
        self.assertEqual(candidate['score'], 1.0)

    def test_smart_resolver_reuses_consistent_cross_project_reference(self):
        missing = self.root / 'missing.rpp'
        missing.write_text(RPP.replace('Media/kick.wav', 'Z:\\\\lost\\\\kick.wav'), encoding='utf-8')
        self.e.scan(); self.e.smart_index()
        moved = self.root / 'Samples' / 'renamed.wav'; moved.parent.mkdir(); self.wav.rename(moved)
        self.e.scan(); item = next(p for p in self.e.projects.values() if p['path'] == 'missing.rpp')
        result = self.e.smart_resolve(item['id'])['missing'][0]
        self.assertTrue(result['expected']['seededFromOtherProject'])
        self.assertTrue(result['candidates'][0]['signals']['sha256Match'])
        self.assertIn('harmonicBands', result['candidates'][0]['signals'])
        self.assertIn('rhythm', result['candidates'][0]['signals'])
        self.assertEqual(result['candidates'][0]['path'], 'Samples/renamed.wav')

    def test_waveform_fingerprint(self):
        other = self.root / 'Media' / 'copy.wav'; other.write_bytes(self.wav.read_bytes())
        self.e.scan()
        result = self.e.fingerprint_compare('Media/kick.wav', 'Media/copy.wav')
        self.assertTrue(result['sha256Identical'])
        self.assertGreaterEqual(result['similarity'], .99)

    def test_folder_mapping_suggestions(self):
        folder = self.root / 'Samples' / 'Drums'; folder.mkdir(parents=True)
        (folder / 'snare.wav').write_bytes(self.wav.read_bytes())
        self.e.scan()
        self.assertTrue(any(x['category'] == 'audio_library' for x in self.e.folder_mappings()))

    def test_health_check_flags_full_scale(self):
        result = self.e.health_check()
        self.assertGreaterEqual(result['issueCount'], 1)
        self.assertTrue(any(x['type'] == 'full-scale' for x in result['issues']))

    def test_cross_daw_map(self):
        second = self.root / 'second.rpp'
        second.write_text(RPP.replace('Drums', 'drums').replace('session', 'second'), encoding='utf-8')
        self.e.scan(); items = list(self.e.projects.values())
        out = self.e.cross_sync(items[0]['id'], items[1]['id'])
        self.assertTrue(out['trackMappings'])
        self.assertEqual(out['trackMappings'][0]['sharedMedia'], 1)

    def test_session_export_plus_consolidates_raw_audio(self):
        p = next(iter(self.e.projects.values()))
        result = self.e.session_export(p['id'], p['hash'], confirm=True)
        self.assertEqual(len(result['stems']), 1)
        archive = self.e.downloads[result['downloadId']]
        with zipfile.ZipFile(archive) as z:
            self.assertTrue(any(x.endswith('.wav') for x in z.namelist()))
            manifest = json.loads(z.read('manifest.json'))
            self.assertIn('no DAW/plugin rendering', manifest['renderMode'])
            self.assertEqual(manifest['version'], 3)
            self.assertEqual(len(manifest['exportedItems']['stemFiles']), 1)
            self.assertEqual(len(manifest['exportedItems']['validatedSourceInputs']), 1)
            self.assertIn('session.json', manifest['exportedItems']['archiveFiles'])
            self.assertEqual(manifest['missingSourceWarnings'], [])
            self.assertTrue(result['exportReport']['exportedItems']['stemFiles'])
            neutral = json.loads(z.read('session.json'))
            self.assertEqual(neutral['schema'], 'dawbridge.neutral-session')

    def test_metadata_sync_v3_roundtrip_and_v2_import(self):
        data = {'version': 2, 'folderMappings': [{'source': 'Samples', 'target': 'audio_library'}],
                'presets': {'user': {'x': 1}}, 'metadata': {'artist': 'Local'}, 'markers': [{'name': 'A'}],
                'projectMappings': [], 'tags': {'Media/kick.wav': ['kick']}, 'automation': {'runOnChange': False}}
        self.e.save_settings(data)
        self.assertEqual(self.e.get_settings()['version'], 3)
        self.assertEqual(self.e.get_settings()['metadata']['artist'], 'Local')
        self.assertEqual(self.e.get_settings()['tags']['Media/kick.wav'], ['kick'])


    def test_pro_fingerprint_has_spectral_segments(self):
        other = self.root / 'Media' / 'spectral-copy.wav'
        other.write_bytes(self.wav.read_bytes())
        self.e.scan()
        profile = self.e._fingerprint(self.wav)
        self.assertEqual(len(profile['bandEnergy']), 48)
        self.assertTrue(profile['spectralHash'])
        result = self.e.fingerprint_compare('Media/kick.wav', 'Media/spectral-copy.wav')
        self.assertGreaterEqual(result['components']['spectral'], .99)
        self.assertGreaterEqual(result['similarity'], .99)

    def test_producer_report_includes_metrics_and_bands(self):
        report = self.e.producer_analysis('Media/kick.wav')
        self.assertIn('crestDb', report)
        self.assertEqual(len(report['bandEnergy']), 8)
        self.assertEqual(report['stereoBalanceDbRtoL'], None)
        self.assertTrue(report['sha256'])
        self.assertIn('technicalFlags', report)

    def test_auto_tempo_finds_click_track_as_suggestion(self):
        path = self.root / 'Media' / 'click.wav'
        rate = 8000
        frames = []
        for i in range(rate * 6):
            beat = i % (rate // 2)
            sample = int(16000 * max(0.0, 1 - beat / (rate * .04))) if beat < rate * .04 else 0
            frames.extend((sample, sample))
        with wave.open(str(path), 'wb') as w:
            w.setparams((2, 2, rate, 0, 'NONE', 'NONE'))
            w.writeframes(struct.pack('<' + 'h' * len(frames), *frames))
        result = self.e.auto_tempo('Media/click.wav')
        self.assertAlmostEqual(result['bpm'], 120, delta=2)
        self.assertGreater(result['confidence'], .1)

    def test_folder_watcher_marks_project_conflict(self):
        self.e.start_watcher(interval=30)
        try:
            self.project.write_text(RPP + '; external edit', encoding='utf-8')
            changes = self.e._poll_watch()
            self.assertTrue(changes)
            item = next(iter(self.e.projects.values()))
            self.assertIn(item['path'], self.e.watcher_status()['conflicts'])
            with self.assertRaisesRegex(ValueError, 'watcher wykrył'):
                self.e._assert_daw_closed(item, self.project)
        finally:
            self.e.stop_watcher()

    def test_opt_in_watcher_auto_fingerprints_and_tags_new_media(self):
        self.e.save_settings({'version': 3, 'automation': {'runOnChange': True, 'autoFingerprintNewMedia': True,
                                                            'autoTagNewMedia': True}})
        self.e.start_watcher(interval=30)
        try:
            added = self.root / 'Media' / 'new-loop.wav'
            added.write_bytes(self.wav.read_bytes())
            self.e._poll_watch()  # detect; wait for the next stable stat before automatic I/O
            self.e._poll_watch()
            self.assertTrue(self.e._fingerprint(added).get('spectralHash'))
            self.assertIn('Media/new-loop.wav', self.e.get_settings()['tags'])
        finally:
            self.e.stop_watcher()

    def test_auto_repair_proposes_and_does_not_write(self):
        self.project.write_text(RPP.replace('Media/kick.wav', 'Z:\\\\lost\\\\kick.wav'), encoding='utf-8')
        self.e.scan()
        item = next(iter(self.e.projects.values()))
        before = self.project.read_bytes()
        result = self.e.run_workflow('auto-repair', pid=item['id'], expected_hash=item['hash'])
        self.assertEqual(result['status'], 'proposal-only')
        self.assertFalse(result['writes'])
        self.assertEqual(self.project.read_bytes(), before)

    def test_metadata_workflows_require_confirmation(self):
        with self.assertRaisesRegex(ValueError, 'confirm=true'):
            self.e.run_workflow('auto-markers', path='Media/kick.wav')
        with self.assertRaisesRegex(ValueError, 'confirm=true'):
            self.e.run_workflow('auto-tagging', path='Media/kick.wav')
        marked = self.e.run_workflow('auto-markers', path='Media/kick.wav', confirm=True)
        tagged = self.e.run_workflow('auto-tagging', path='Media/kick.wav', confirm=True)
        self.assertEqual(marked['status'], 'metadata-only')
        self.assertEqual(tagged['status'], 'metadata-only')

    def test_metadata_brain_and_snapshot(self):
        item = next(iter(self.e.projects.values()))
        generated = self.e.metadata_brain(item['id'])
        self.assertTrue(generated['metadata']['tags'])
        snapshot = self.e.create_snapshot(item['id'])
        self.assertTrue((self.root / snapshot['file']).is_file())
        self.assertTrue(self.e.snapshot_history())

    def test_plugin_awareness_explains_unverified_installation(self):
        item = next(iter(self.e.projects.values()))
        result = self.e.plugin_awareness(item['id'])
        self.assertEqual(result['installationStatus'], 'not checked; no scan of system plugin directories or registry')

    def test_rpp_basic_routing_parse(self):
        routed = RPP.replace('NAME "Drums"', 'NAME "Drums"\n  AUXRECV 0 0 1 0 0 1')
        parsed = parse_rpp(routed.encode())
        self.assertEqual(len(parsed['routing']), 1)
        self.assertEqual(parsed['routing'][0]['targetTrack'], 0)

    def test_path_boundary_rejects_parent_traversal(self):
        with self.assertRaises(ValueError): safe(self.root, self.root / '..' / 'outside.wav')

    def test_safe_mode_blocks_running_daW_process(self):
        item = next(iter(self.e.projects.values()))
        fake = type('Process', (), {'info': {'name': 'reaper.exe', 'cmdline': ['reaper.exe']}})()
        with patch('engine.psutil.process_iter', return_value=[fake]):
            with self.assertRaisesRegex(ValueError, 'zamknij DAW'):
                self.e._assert_daw_closed(item, self.project)

    def test_als_rejects_dtd_and_entities(self):
        bad = b'<!DOCTYPE Ableton [<!ENTITY x SYSTEM "file:///etc/passwd">]><Ableton>&x;</Ableton>'
        with self.assertRaisesRegex(ValueError, 'DTD/ENTITY'):
            parse_als(bad)

    def test_pcm_24_bit_analysis_vectorized_decode(self):
        p = self.root / 'Media' / '24bit.wav'
        def pack24(value):
            if value < 0: value += 1 << 24
            return bytes((value & 255, (value >> 8) & 255, (value >> 16) & 255))
        with wave.open(str(p), 'wb') as w:
            w.setparams((1, 3, 8000, 0, 'NONE', 'NONE'))
            w.writeframes(pack24(0) + pack24(8388607) + pack24(-8388608) + pack24(0))
        report = analyze_wav(p)
        self.assertEqual(report['bits'], 24)
        self.assertEqual(report['peakDbfs'], 0)
        self.assertEqual(report['fullScaleSamples'], 2)

    def test_adaptive_fingerprint_handles_short_one_shot_and_is_cached(self):
        first = self.e._fingerprint(self.wav)
        second = self.e._fingerprint(self.wav)
        self.assertEqual(first['fingerprintVersion'], 4)
        self.assertGreaterEqual(first['adaptiveSegmentCount'], 1)
        self.assertIsNotNone(first['tonality'])
        self.assertEqual(first, second)
        comparison = self.e.fingerprint_compare('Media/kick.wav', 'Media/kick.wav')
        self.assertGreaterEqual(comparison['similarity'], .99)
        self.assertTrue(comparison['sha256Identical'])
        self.assertIn('harmonicBands', comparison['components'])

    def test_god_mode_audio_reports_use_bounded_local_features(self):
        fp = self.e._fingerprint(self.wav)
        self.assertLessEqual(fp['adaptiveCoverageSeconds'], 180)
        integrity = self.e.mix_integrity('Media/kick.wav')
        self.assertEqual(integrity['path'], 'Media/kick.wav')
        self.assertTrue(integrity['flags'])
        tonality = self.e.auto_tonality('Media/kick.wav')
        self.assertIn('tonality', tonality)
        transient = self.e.auto_transient_map('Media/kick.wav')
        self.assertFalse(transient['writesProject'])
        self.assertIn('beatGridSeconds', transient)
        scheduler = self.e.performance_stats()['analysisScheduler']
        self.assertGreaterEqual(scheduler['maxWorkers'], 1)
        self.assertEqual(scheduler['queued'], 0)

    def test_smart_similarity_search_ranks_identical_copy(self):
        copy = self.root / 'Media' / 'kick-copy.wav'
        copy.write_bytes(self.wav.read_bytes())
        self.e.scan()
        result = self.e.smart_similarity_search('Media/kick.wav')
        self.assertEqual(result['candidateCount'], 1)
        self.assertEqual(result['results'][0]['path'], 'Media/kick-copy.wav')
        self.assertTrue(result['results'][0]['sha256Identical'])

    def test_auto_gain_match_exports_float_copy_without_changing_source(self):
        before = self.wav.read_bytes()
        report = self.e.gain_match_report(['Media/kick.wav'])
        self.assertTrue(report['items'][0]['crestFactorPreserved'])
        exported = self.e.gain_match_export(['Media/kick.wav'])
        self.assertTrue(self.wav.read_bytes() == before)
        archive = self.e.downloads[exported['downloadId']]
        with zipfile.ZipFile(archive) as z:
            self.assertTrue(any(x.endswith('-gainmatched.wav') for x in z.namelist()))
            manifest = json.loads(z.read('gain-match-manifest.json'))
            self.assertTrue(manifest['outputs'][0]['sourceUnchanged'])

    def test_auto_stem_rebuild_requires_confirm_and_detects_duplicates(self):
        item = next(iter(self.e.projects.values()))
        with self.assertRaisesRegex(ValueError, 'confirm=true'):
            self.e.run_workflow('auto-stem-rebuild', pid=item['id'], expected_hash=item['hash'])
        original = self.wav.read_bytes()
        result = self.e.run_workflow('auto-stem-rebuild', pid=item['id'], expected_hash=item['hash'], confirm=True,
                                     gain_match=True)
        self.assertEqual(result['workflow'], 'Auto Stem Rebuild')
        self.assertTrue(result['gainMatchingApplied'])
        self.assertIn('identicalContentSha256', result['duplicateDetection'])
        self.assertFalse(result['exportReport']['renderedByDaw'])
        self.assertTrue(result['exportReport']['exportsSourceMediaNotDawMix'])
        self.assertIn('nie jest miks', result['exportReport']['userNotice'])
        with zipfile.ZipFile(self.e.downloads[result['downloadId']]) as z:
            manifest = json.loads(z.read('manifest.json'))
            self.assertIn('gainMatching', manifest)
        self.assertEqual(self.wav.read_bytes(), original)

    def test_storyboard_snapshot_v4_and_diff(self):
        item = next(iter(self.e.projects.values()))
        board = self.e.session_storyboard(item['id'])
        self.assertEqual(board['project'], 'session.rpp')
        self.assertTrue(board['chapters'])
        old = self.e.create_snapshot(item['id'])
        self.project.write_text(RPP.replace('Start', 'Verse'), encoding='utf-8')
        self.e.scan()
        item = next(iter(self.e.projects.values()))
        new = self.e.create_snapshot(item['id'])
        self.assertEqual(new['version'], 4)
        diff = self.e.compare_snapshots(old['file'], new['file'])
        self.assertTrue(diff['projectHashChanged'])
        self.assertTrue(diff['markers']['added'])

    def test_plugin_awareness_x_and_watchdog_are_conservative(self):
        item = next(iter(self.e.projects.values()))
        plugins = self.e.plugin_awareness_x(item['id'])
        self.assertEqual(plugins['compatibilityReport']['status'], 'unverified')
        self.assertFalse(plugins['compatibilityReport']['platformScanPerformed'])
        report = self.e.watchdog_x(item['id'])
        self.assertTrue(report['safeMode'])
        self.assertFalse(report['writesAllowed'])

    def test_routing_map_and_library_intelligence(self):
        self.project.write_text(RPP.replace('NAME "Drums"', 'NAME "Drums"\n  AUXRECV 0 0 1 0 0 1'), encoding='utf-8')
        self.e.scan()
        item = next(iter(self.e.projects.values()))
        routes = self.e.routing_map(item['id'])
        self.assertTrue(routes['routingEdges'])
        library = self.e.library_intelligence(10)
        self.assertEqual(library['analyzedFiles'], 1)
        self.assertTrue(library['items'][0]['path'].endswith('kick.wav'))

    def test_light_mode_is_persisted_and_skips_audio_headers(self):
        settings = self.e.get_settings()
        settings['preferences']['scanMode'] = 'turbo'
        self.e.save_settings(settings)
        with patch.object(self.e, '_audio_meta', side_effect=AssertionError('Light Mode must skip audio headers')) as reader:
            result = self.e.scan()
        reader.assert_not_called()
        self.assertEqual(result['scanMode'], 'turbo')
        self.assertTrue(any('Turbo Scan' in warning for warning in result['warnings']))

    def test_deep_scan_runs_bounded_local_tempo_transient_and_tonal_analysis(self):
        result = self.e.scan('deep')
        summary = result['deepAnalysis']
        self.assertEqual(result['scanMode'], 'deep')
        self.assertEqual(summary['status'], 'complete')
        self.assertEqual(summary['analyzedFiles'], 1)
        row = summary['results'][0]
        self.assertEqual(row['path'], 'Media/kick.wav')
        self.assertIn('bpm', row['tempo'])
        self.assertIn('key', row['tonality'])
        self.assertGreaterEqual(row['transientCount'], 0)
        self.assertLessEqual(row['coverageSeconds'], summary['perFileLimitSeconds'])
        self.assertIn('not ML', summary['method'])

    def test_deep_scan_caps_file_selection(self):
        for i in range(21):
            (self.root / 'Media' / f'copy-{i:02d}.wav').write_bytes(self.wav.read_bytes())
        result = self.e.scan('deep')
        summary = result['deepAnalysis']
        self.assertEqual(summary['candidateCount'], 22)
        self.assertEqual(summary['selectedCount'], 20)
        self.assertEqual(summary['notSelectedCount'], 2)
        self.assertEqual(summary['status'], 'partial')
        self.assertTrue(any('2 nie wybrano' in warning for warning in result['warnings']))

    def test_project_parsing_precedes_parallel_audio_metadata(self):
        order = []
        parse = self.e._parse_project
        audio_meta = self.e._audio_meta
        def record_parse(path, ext):
            order.append(('project', path.name))
            return parse(path, ext)
        def record_audio(path):
            order.append(('audio', path.name))
            return audio_meta(path)
        with patch.object(self.e, '_parse_project', side_effect=record_parse), \
             patch.object(self.e, '_audio_meta', side_effect=record_audio):
            self.e.scan()
        first_audio = next(i for i, entry in enumerate(order) if entry[0] == 'audio')
        self.assertTrue(order[:first_audio])
        self.assertTrue(all(entry[0] == 'project' for entry in order[:first_audio]))
        self.assertGreaterEqual(self.e.state['performance']['cache']['hits'], 0)

    def test_technical_auto_tags_have_only_allowed_categories(self):
        result = self.e.run_workflow('auto-tagging', path='Media/kick.wav', confirm=True)
        tags = result['tags']['Media/kick.wav']
        self.assertTrue(tags)
        self.assertTrue(all(tag.split(':', 1)[0] in {'source_type', 'bpm', 'key', 'energy'} for tag in tags))
        self.assertTrue(any(tag.startswith('source_type:') for tag in tags))
        self.assertNotIn('kick', tags)
        self.assertIn('RMS-derived', result['note'])

    def test_preflight_warns_about_backup_and_blocks_low_disk(self):
        item = next(iter(self.e.projects.values()))
        ready = self.e.preflight(item['id'], 'repair')
        self.assertTrue(ready['supported'])
        self.assertTrue(any('backup' in warning.casefold() for warning in ready['warnings']))
        fake_usage = type('Usage', (), {'free': 0})()
        with patch('god_engine.shutil.disk_usage', return_value=fake_usage):
            low = self.e.preflight(item['id'], 'repair')
        self.assertEqual(low['status'], 'blocked')
        self.assertTrue(any('Za mało wolnego miejsca' in reason for reason in low['blockedReasons']))

    def test_preflight_blocks_if_watcher_state_is_uncertain(self):
        item = next(iter(self.e.projects.values()))
        with patch.object(self.e, 'watcher_status', return_value={'enabled': True, 'lastError': 'access denied', 'conflicts': []}):
            result = self.e.preflight(item['id'], 'stems')
        self.assertFalse(result['ready'])
        self.assertTrue(any('Watcher nie może wiarygodnie' in reason for reason in result['blockedReasons']))

    def test_preflight_blocks_audio_source_changed_since_scan(self):
        item = next(iter(self.e.projects.values()))
        ready = self.e.preflight(item['id'], 'stems')
        self.assertTrue(ready['ready'], ready['blockedReasons'])
        self.wav.write_bytes(self.wav.read_bytes() + b'changed')
        blocked = self.e.preflight(item['id'], 'stems')
        self.assertFalse(blocked['ready'])
        self.assertTrue(any('zmieniło się od skanu' in reason for reason in blocked['blockedReasons']))

    def test_preflight_and_compatibility_show_open_process_and_read_only_parser(self):
        fake = type('Process', (), {'info': {'name': 'reaper.exe', 'cmdline': ['C:\\Program Files\\REAPER\\reaper.exe']}})()
        item = next(iter(self.e.projects.values()))
        with patch('engine.psutil.process_iter', return_value=[fake]):
            result = self.e.preflight(item['id'], 'repair')
        self.assertEqual(result['status'], 'blocked')
        self.assertTrue(result['dawProcesses'])
        song = self.root / 'partial.song'
        with zipfile.ZipFile(song, 'w') as archive:
            archive.writestr('document.xml', b'<Song tempo="120"><AudioTrack name="Pads"/></Song>')
        opaque = self.root / 'opaque.cpr'
        opaque.write_bytes(b'\x00opaque CPR binary')
        self.e.scan()
        song_item = next(x for x in self.e.projects.values() if x['path'] == 'partial.song')
        report = self.e.session_compatibility_report(song_item['id'])
        self.assertTrue(report['readOnly'])
        self.assertTrue(report['partialParserWarning'])
        self.assertIn('pluginNamesAndDependencies', report['heuristicHints'])
        cpr_item = next(x for x in self.e.projects.values() if x['path'] == 'opaque.cpr')
        cpr_report = self.e.session_compatibility_report(cpr_item['id'])
        self.assertEqual(cpr_report['reliableExtractedData']['fieldNamesWithinAdapterScope'], [])
        self.assertTrue(cpr_report['readOnly'])

    def test_project_export_and_stem_direct_calls_require_confirmation(self):
        item = next(iter(self.e.projects.values()))
        with self.assertRaisesRegex(ValueError, 'confirm=true'):
            self.e.export(item['id'], item['hash'])
        with self.assertRaisesRegex(ValueError, 'confirm=true'):
            self.e.session_export(item['id'], item['hash'])
        with self.assertRaisesRegex(ValueError, 'confirm=true'):
            self.e.auto_stem_rebuild(item['id'], item['hash'])

    def test_open_daw_blocks_portable_and_session_exports(self):
        item = next(iter(self.e.projects.values()))
        fake = type('Process', (), {'info': {'name': 'reaper.exe', 'cmdline': ['reaper.exe']}})()
        with patch('engine.psutil.process_iter', return_value=[fake]):
            with self.assertRaisesRegex(ValueError, 'zamknij DAW'):
                self.e.export(item['id'], item['hash'], confirm=True)
            with self.assertRaisesRegex(ValueError, 'zamknij DAW'):
                self.e.session_export(item['id'], item['hash'], confirm=True)
            with self.assertRaisesRegex(ValueError, 'zamknij DAW'):
                self.e.run_workflow('auto-stem-rebuild', pid=item['id'], expected_hash=item['hash'], confirm=True)

    def test_settings_validate_scan_and_debug_preferences(self):
        settings = self.e.get_settings()
        settings['preferences'] = {'lightMode': True, 'logLevel': 'debug'}
        self.e.save_settings(settings)
        self.assertEqual(self.e.get_settings()['preferences']['logLevel'], 'debug')
        self.assertEqual(self.e.get_settings()['preferences']['scanMode'], 'turbo')
        settings['preferences'] = {'scanMode': 'deep', 'logLevel': 'debug'}
        self.e.save_settings(settings)
        self.assertEqual(self.e.get_settings()['preferences']['scanMode'], 'deep')
        with self.assertRaisesRegex(ValueError, 'logLevel'):  
            self.e.save_settings({**settings, 'preferences': {'lightMode': True, 'logLevel': 'trace'}})
        event = self.e.debug_event('test-debug', 'debug detail')
        self.assertEqual(event['level'], 'debug')

    def test_cache_persists_hash(self):
        first = self.e._hash(self.wav); self.assertEqual(self.e._hash(self.wav), first)

if __name__ == '__main__':
    unittest.main(verbosity=2)
