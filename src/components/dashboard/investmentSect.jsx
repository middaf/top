
import styles from "./DashboardSect.module.css";

const InvestmentSect = ({ setWidgetState, setInvestData, currentUser, investments}) => {
  const currentDate = new Date();

  const currentDayOfMonth = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const dateString =
    currentYear + "-" + (currentMonth + 1) + "-" + currentDayOfMonth;

    const investProcess = (vlad, clad, blad) => {
        setInvestData({
            idnum: currentUser?.idnum,
            plan: vlad,
            status: "Pending",
            capital: clad,
            date: new Date().toISOString(),
            duration: blad,
            paymentOption: "Bitcoin",
            authStatus: "unseen",
            admin: false,
            roi: 0,
            bonus: 0
        });
        setWidgetState({
            state: true,
            type: "invest",
        })
    }
  return (
    <div className="investmentMainCntn">
      <div className="myinvestmentSection">
        <h2>Investments History</h2>
        {
            investments.length > 0 ? (
                <div className="historyTable">
                    <div className="investmentTablehead header">
                        <div className="unitheadsect">S/N</div>
                        <div className="unitheadsect">Plan</div>
                        <div className="unitheadsect">Capital</div>
                        <div className="unitheadsect">Status</div>
                        <div className="unitheadsect">Days Spent</div>
                        <div className="unitheadsect">Days Remaining</div>
                    </div>
                    {
                        investments.sort((a, b) => {
                          const dateA = new Date(a.date);
                          const dateB = new Date(b.date);
                        
                          return dateB - dateA;
                        }).map((elem, idx) => (
                            <div className="investmentTablehead" key={`${elem.id}-userDash_${idx}`}>
                                <div className="unitheadsect">{idx + 1}</div>
                                <div className="unitheadsect">{elem?.plan}</div>
                                <div className="unitheadsect">${elem?.capital.toLocaleString()}</div>
                                <div className="unitheadsect"><span style={{color: `${elem?.status === "Pending" ? "#F9F871" : elem?.status === "Expired" ? "#DC1262" : "#2DC194"}`}}>{elem?.status}</span></div>
                                <div className="unitheadsect">{elem?.status === "Pending" ? "0" : elem?.status === "Expired" ? "0" : `${Math.floor((new Date(dateString) - new Date(elem?.date)) / (1000 * 60 * 60 * 24)) + 1}`}</div>
                                <div className="unitheadsect">{elem?.status === "Pending" ? `${elem?.duration}` : elem?.status === "Expired" ? "0" : `${elem?.duration - (Math.floor((new Date(dateString) - new Date(elem?.date)) / (1000 * 60 * 60 * 24)) + 1)}`}</div>
                            </div>
                        ))
                    }
                </div>

            ) : (

                <div className="emptyTable">
                    <i className="icofont-exclamation-tringle"></i>
                    <p>
                        Your investment history is currently empty.{" "}
                        <a href="#packages">Invest now</a>
                    </p>
                </div>
            )
        }
        <section className={styles.packages} id="packages">
          <h2 className={styles.packagesTitle}>Our Available Packages</h2>
        <div className={styles.packageGrid}>
          <div className={styles.packageCard}>
            <div className={styles.packageTitle}>SILVER</div>
            <div className={styles.packagePrice}>
              <span>$100</span> - <span>$900</span>
            </div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>5X ROI</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>5X bonus on investment</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>Get ROI and bonus in 2 Days</span>
              </li>
            </ul>
            <button 
              className={`${styles.investButton} ${styles.standardButton}`}
              onClick={() => {investProcess("Silver", 100, 2)}}
            >
              Start Investing
            </button>
          </div>

          <div className={`${styles.packageCard} ${styles.diamond}`}>
            <div className={styles.packageTitle}>
              DIAMOND <i className="icofont-diamond"></i>
            </div>
            <div className={styles.packagePrice}>
              <span>$10,000</span> - <span>$100,000</span>
            </div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>5X ROI</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>10X Bonus on investment</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>Get ROI and bonus in 7 Days</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>Access to 15 digital financial resources</span>
              </li>
            </ul>
            <button 
              className={`${styles.investButton} ${styles.diamondButton}`}
              onClick={() => {investProcess("Diamond", 10000, 7)}}
            >
              Premium Investment
            </button>
          </div>

          <div className={styles.packageCard}>
            <div className={styles.packageTitle}>GOLD</div>
            <div className={styles.packagePrice}>
              <span>$1,000</span> - <span>$9000</span>
            </div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>5X ROI</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>8X Bonus on investment</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>Get ROI and bonus in 4 Days</span>
              </li>
              <li className={styles.featureItem}>
                <i className={`icofont-tick-mark ${styles.featureIcon}`}></i>
                <span className={styles.featureText}>Access to 5 digital financial resources</span>
              </li>
            </ul>
            <button 
              className={`${styles.investButton} ${styles.standardButton}`}
              onClick={() => {investProcess("Gold", 1000, 5)}}
            >
              Start Investing
            </button>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default InvestmentSect;
