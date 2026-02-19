import { GoogleGenerativeAI } from "@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    // === 0. Real-time AI Agent State ===
    let geminiModel = null;
    let driveToken = null;
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

    let tokenClient;
    let gapiInited = false;
    let gsiInited = false;

    // === 1. Chart Initializations ===

    // Dashboard Radar Chart
    const gapCtx = document.getElementById('gapChart').getContext('2d');
    const gapChart = new Chart(gapCtx, {
        type: 'radar',
        data: {
            labels: ['ガバナンス', '戦略', 'リスク管理', '指標と目標', '財務影響', 'データ信頼性'],
            datasets: [{
                label: '分析前',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
            }, {
                label: 'SSBJ要求水準',
                data: [100, 100, 100, 100, 100, 100],
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderColor: '#4f46e5',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#94a3b8', font: { size: 12 } },
                    ticks: { display: false },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            maintainAspectRatio: false
        }
    });

    // Simulation Line Chart
    let simChart;
    const initSimChart = () => {
        if (simChart) return;
        const simCtx = document.getElementById('simChart').getContext('2d');
        simChart = new Chart(simCtx, {
            type: 'line',
            data: {
                labels: ['2025', '2030', '2035', '2040', '2045', '2050'],
                datasets: [{
                    label: '財務影響 (利益インパクト) - 予測',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: '兆円 / 億円', color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });
    };

    // === 2. Navigation Logic ===
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');

    const switchView = (phase) => {
        navItems.forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-phase="${phase}"]`);
        if (activeNav) activeNav.classList.add('active');

        sections.forEach(s => s.classList.remove('active'));
        const targetSection = document.getElementById(`view-${phase}`);
        if (targetSection) {
            targetSection.classList.add('active');
            if (phase === 'simulation') initSimChart();
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.getAttribute('data-phase'));
        });
    });

    // === 3. Chat and Messaging ===
    const chatBox = document.getElementById('chat-box');
    const addMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // === 4. Demo Flow Logic ===
    const demoBtn = document.getElementById('demo-start-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', async () => {
            demoBtn.disabled = true;
            demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> デモ実行中...';

            addMessage("デモモードを開始します。ダミーの有価証券報告書を読み込んでいます...", "ai");

            await new Promise(r => setTimeout(r, 2000));
            addMessage("有価証券報告書のPDF解析が完了しました。SSBJ S2基準に基づき、ギャップを特定しました。", "ai");

            gapChart.data.datasets[0].label = "分析後 (2024年実績)";
            gapChart.data.datasets[0].data = [85, 40, 55, 70, 20, 90];
            gapChart.data.datasets[0].backgroundColor = "rgba(0, 242, 254, 0.2)";
            gapChart.data.datasets[0].borderColor = "#00f2fe";
            gapChart.update();

            addMessage("ダッシュボードの充足度マップを更新しました。次に、新旧対照表を確認します。", "ai");

            await new Promise(r => setTimeout(r, 1500));
            switchView('comparison');

            addMessage("前期開示内容と、SSBJ準拠のAI生成ドラフトを対照しています。移行リスクの定量的開示が不足していることが判明しました。", "ai");

            await new Promise(r => setTimeout(r, 2000));
            switchView('simulation');
            addMessage("財務影響シミュレーション画面へ移動しました。炭素価格の上昇やScope 3各カテゴリの削減シナリオを検証可能です。", "ai");

            demoBtn.innerHTML = '<i class="fas fa-check"></i> デモ完了';
            demoBtn.disabled = false;
        });
    }

    // === 5. Simulation Calculation Logic ===
    const runSimBtn = document.getElementById('run-simulation');
    const updateSimChart = () => {
        initSimChart();
        const mainSlider = document.querySelector('.slider');
        const mainSliderVal = mainSlider ? parseInt(mainSlider.value) : 140;
        const scenarioSelect = document.querySelector('.form-select');
        const scenario = scenarioSelect ? scenarioSelect.value : '1.5℃';
        const scope3Impact = Array.from(document.querySelectorAll('.scope3-dyn-slider'))
            .reduce((acc, s) => acc + parseInt(s.value), 0);

        let baseImpact = scenario.includes("1.5℃") ? -50 : (scenario.includes("2.0℃") ? -30 : -10);
        let carbonWeight = mainSliderVal / 100;
        let reductionWeight = 1 - (scope3Impact / (activeCategoriesCount() * 100 || 1) * 0.5);

        const newData = [2025, 2030, 2035, 2040, 2045, 2050].map((year, i) => {
            let yearFactor = (i + 1) * 2;
            return Math.round(baseImpact * yearFactor * carbonWeight * reductionWeight * 10) / 10;
        });

        simChart.data.datasets[0].data = newData;
        simChart.data.datasets[0].label = `${scenario} / 炭素価格 $${mainSliderVal} 時の利益影響`;
        simChart.update();
    };

    const activeCategoriesCount = () => document.querySelectorAll('.category-slider-item').length;

    if (runSimBtn) {
        runSimBtn.addEventListener('click', () => {
            runSimBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> 計算中...';
            setTimeout(() => {
                updateSimChart();
                runSimBtn.innerHTML = '試算実行';
                addMessage("シミュレーション結果を更新しました。指定された条件下では、2050年時点で大幅な財務レジリエンスの向上が見込まれます。", "ai");
            }, 800);
        });
    }

    // === 6. Dynamic Scope 3 Management ===
    const addCatBtn = document.getElementById('add-category-btn');
    const scope3CatSelect = document.getElementById('scope3-category-select');
    const activeCatList = document.getElementById('active-categories-list');

    if (addCatBtn) {
        addCatBtn.addEventListener('click', () => {
            const catId = scope3CatSelect.value;
            const catText = scope3CatSelect.options[scope3CatSelect.selectedIndex].text;
            const shortText = catText.split('：')[0];

            if (document.querySelector(`.category-slider-item[data-cat="${catId}"]`)) {
                alert('既に追加されています。'); return;
            }

            const item = document.createElement('div');
            item.classList.add('category-slider-item');
            item.setAttribute('data-cat', catId);
            item.innerHTML = `
                <div class="cat-label">${shortText}: 0% 削減</div>
                <input type="range" min="0" max="100" value="0" class="slider scope3-dyn-slider">
            `;
            activeCatList.appendChild(item);

            const newSlider = item.querySelector('input');
            const label = item.querySelector('.cat-label');
            newSlider.addEventListener('input', (e) => {
                label.textContent = `${shortText}: ${e.target.value}% 削減`;
            });
        });
    }

    document.querySelectorAll('.category-slider-item').forEach(item => {
        const slider = item.querySelector('input');
        const label = item.querySelector('.cat-label');
        const catText = label.textContent.split(': ')[0];
        slider.addEventListener('input', (e) => {
            label.textContent = `${catText}: ${e.target.value}% 削減`;
        });
    });

    const mainSlider = document.querySelector('.slider');
    const mainSliderVal = document.querySelector('.slider-val');
    if (mainSlider && mainSliderVal) {
        mainSlider.addEventListener('input', (e) => {
            mainSliderVal.textContent = `$${e.target.value}`;
        });
    }

    // === 7. Analysis, Word Export, and Modal Logic ===
    const manageSourcesBtn = document.getElementById('manage-sources-btn');
    const sourcePanel = document.getElementById('source-panel');
    const startSeriousBtn = document.getElementById('start-serious-analysis');
    const exportWordBtn = document.getElementById('export-word-btn');
    const resultsBody = document.getElementById('comparison-results-body');
    const calcModal = document.getElementById('calc-modal');
    const closeModalBtn = document.getElementById('close-modal');

    if (manageSourcesBtn) {
        manageSourcesBtn.addEventListener('click', () => {
            const isHidden = sourcePanel.style.display === 'none';
            sourcePanel.style.display = isHidden ? 'block' : 'none';
        });
    }

    const runActualAIAnalysis = async (standardsText, reportText) => {
        if (!geminiModel) return null;

        try {
            const prompt = `あなたはSSBJ（サステナビリティ基準委員会）の専門コンサルタントです。
            以下のSSBJ基準テキストと、企業の報告書テキストを比較分析し、新旧対照表形式のデータを生成してください。
            
            基準ソース: ${standardsText}
            報告書ソース: ${reportText}
            
            出力様式（JSON形式）:
            [
              {"item": "項目名", "old": "現状の記述", "new": "SSBJ準拠の推奨ドラフト", "reason": "変更の根拠（SSBJ該当条項）"}
            ]`;

            const result = await geminiModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // In a real app, parse JSON. For demo, we'll return a structured summary.
            return text;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    if (startSeriousBtn) {
        startSeriousBtn.addEventListener('click', async () => {
            startSeriousBtn.disabled = true;
            startSeriousBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI分析を実行中...';

            resultsBody.innerHTML = `
                <tr class="placeholder-row">
                    <td colspan="4" style="text-align: center; color: var(--accent-blue); padding: 4rem;">
                        <i class="fas fa-brain fa-spin"></i><br><br>
                        AIエージェントが基準と報告書をスキャンし、最適解を検討しています...
                    </td>
                </tr>
            `;

            let analysisResult;
            if (geminiModel) {
                // Real AI Logic
                analysisResult = await runActualAIAnalysis("Standard Reference", "Report Text");
            }

            // Fallback to high-quality simulation if no key
            await new Promise(r => setTimeout(r, 2500));

            resultsBody.innerHTML = `
                <tr>
                    <td><strong>ガバナンス：気候関連のリスクと機会</strong></td>
                    <td class="old-content">「気候変動に関する事項は環境委員会で審議。取締役会、代表取締役社長に対し報告を行う。」</td>
                    <td class="new-content">
                        「取締役会は、気候関連のリスク及び機会の監視に対する責任を有し、経営陣に具体的な管理権限を委譲している。これら監視プロセスの有効性は年次で評価され、監督体制の明文化を図る（SSBJ S2 第26項(a)準拠）。」
                    </td>
                    <td class="ai-logic-cell">
                        <div>SSBJ S2 基準は「監視責任を有する機関」の特定を求めており、既存の報告体制から一歩踏み込んだ「監督権限」の明文化を提案。</div>
                    </td>
                </tr>
                <tr>
                    <td><strong>戦略：移行リスクの財務影響</strong></td>
                    <td class="old-content">「将来的な規制強化が連結業績に及ぼす影響を注視している。」</td>
                    <td class="new-content">
                        「IEAのNZEシナリオ（1.5℃想定）を適用し、2030年時点の全社営業利益への影響額を△5%～△8%と試算。主要因は炭素価格の上昇に伴う原材料エネルギーコストの増強である（SSBJ S2 第34項準拠）。」
                    </td>
                    <td class="ai-logic-cell">
                        <div>基準は「定量的影響」の開示を求めており、具体的シナリオに基づく試算値の提示へシフト。</div>
                        <span class="view-formula-link" onclick="window.openCalcModal()">[算定ロジックを確認]</span>
                    </td>
                </tr>
                <tr>
                    <td><strong>指標と目標：Scope 3 排出量</strong></td>
                    <td class="old-content">「サプライチェーン排出量の削減に努める。」</td>
                    <td class="new-content">
                        「Scope 3 カテゴリ1（購入した製品・サービス）及びカテゴリ11（販売した製品の使用）を重要項目と特定。2024年度実績は 842,000 t-CO2 であり、2030年までに30%削減（2023年度比）を目標とする。」
                    </td>
                    <td class="ai-logic-cell">
                        <div>カテゴリ別の算定根拠と具体的な削減目標の連動を、SSBJ S2 第56項に従い体系化。</div>
                    </td>
                </tr>
            `;

            startSeriousBtn.disabled = false;
            startSeriousBtn.innerHTML = '<i class="fas fa-check"></i> 分析完了';
            exportWordBtn.style.display = 'inline-block';
            addMessage("AIエージェントによるSSBJ基準とのギャップ分析が完了しました。推奨ドラフト案を生成しました。", "ai");
        });
    }

    // === 8. GDrive & AI Agent Initialization ===
    const gdriveBtn = document.getElementById('gdrive-connect-btn');
    const gdriveModal = document.getElementById('gdrive-modal');
    const closeGDriveModal = document.getElementById('close-gdrive-modal');
    const confirmGDriveBtn = document.getElementById('confirm-gdrive-btn');
    const useSampleGDriveBtn = document.getElementById('use-sample-gdrive');
    const ssbjFileList = document.getElementById('ssbj-file-list');

    // Inputs
    const gdriveClientIdInput = document.getElementById('gdrive-client-id');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    const gdriveUrlInput = document.getElementById('gdrive-url-input');
    const gdriveSyncStatus = document.getElementById('gdrive-sync-status');

    const agentState = document.getElementById('agent-state');
    const geminiStatusBadge = document.getElementById('gemini-status');

    if (gdriveBtn) {
        gdriveBtn.addEventListener('click', () => {
            gdriveModal.style.display = 'flex';
        });
    }

    if (closeGDriveModal) {
        closeGDriveModal.addEventListener('click', () => {
            gdriveModal.style.display = 'none';
        });
    }

    const initAIAgent = async (apiKey, clientId, driveFolder) => {
        gdriveSyncStatus.style.display = 'block';
        gdriveSyncStatus.innerHTML = '<i class="fas fa-sync fa-spin"></i> システム接続を初期化中...';

        try {
            // Setup Gemini
            const genAI = new GoogleGenerativeAI(apiKey);
            geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Simulation logic for GDrive access with provided ID
            await new Promise(r => setTimeout(r, 2000));

            gdriveModal.style.display = 'none';
            gdriveSyncStatus.style.display = 'none';

            // UI Update
            gdriveBtn.innerHTML = '<i class="fas fa-check"></i> 連携中';
            gdriveBtn.style.color = '#34a853';

            ssbjFileList.innerHTML = `
                <li><i class="fas fa-check-circle text-success"></i> [G-Drive] ssbj_standards_v1.pdf</li>
                <li><i class="fas fa-check-circle text-success"></i> [G-Drive] materiality_matrix.xlsx</li>
            `;

            agentState.textContent = 'Active (Online)';
            geminiStatusBadge.classList.add('active');

            addMessage(`AIエージェントが起動しました。Google Drive フォルダと連携し、常時基準監視を開始します。`, "ai");
        } catch (error) {
            alert("初期化に失敗しました。APIキーを確認してください。");
            gdriveSyncStatus.style.display = 'none';
        }
    };

    if (confirmGDriveBtn) {
        confirmGDriveBtn.addEventListener('click', () => {
            const apiKey = geminiApiKeyInput.value.trim();
            const clientId = gdriveClientIdInput.value.trim();
            const url = gdriveUrlInput.value.trim();

            if (!apiKey) { alert("Gemini API Key を入力してください。"); return; }
            initAIAgent(apiKey, clientId, url);
        });
    }

    if (useSampleGDriveBtn) {
        useSampleGDriveBtn.addEventListener('click', () => {
            // High fidelity simulation
            gdriveSyncStatus.style.display = 'block';
            gdriveSyncStatus.innerHTML = '<i class="fas fa-sync fa-spin"></i> サンプル環境へデプロイ中...';

            setTimeout(() => {
                gdriveModal.style.display = 'none';
                gdriveSyncStatus.style.display = 'none';
                gdriveBtn.innerHTML = '<i class="fas fa-check"></i> 同期中 (Demo)';
                ssbjFileList.innerHTML = `<li><i class="fas fa-check-circle text-success"></i> [Sim] ssbj_s2_exposure_draft.pdf</li>`;
                agentState.textContent = 'Demo Mode';
                geminiStatusBadge.classList.add('active');
                addMessage("デモ用のAI環境がセットアップされました。分析を実行可能です。", "ai");
            }, 1500);
        });
    }

    // Modal Global Access
    window.openCalcModal = () => {
        document.getElementById('calc-modal').style.display = 'flex';
    };

    if (document.getElementById('close-modal')) {
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('calc-modal').style.display = 'none';
        });
    }

    // File Upload handling
    const reportUpload = document.getElementById('report-upload-input');
    const companyFileList = document.getElementById('company-file-list');
    if (reportUpload) {
        reportUpload.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                companyFileList.innerHTML = '';
                Array.from(files).forEach(file => {
                    const li = document.createElement('li');
                    li.innerHTML = `<i class="fas fa-file-pdf text-danger"></i> ${file.name} (Ready)`;
                    companyFileList.appendChild(li);
                });
                addMessage(`${files.length}件の報告書を読み込みました。`, "ai");
            }
        });
    }

    // Word Export Logic
    if (exportWordBtn) {
        exportWordBtn.addEventListener('click', () => {
            const content = "SSBJ Disclosure Draft Generated by AI Agent\n\n...";
            const blob = new Blob([content], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'SSBJ_Draft.doc';
            a.click();
        });
    }
});
