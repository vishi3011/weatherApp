import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  PermissionsAndroid,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import RNBootSplash from 'react-native-bootsplash';
import moment from 'moment';
import {Colors, showError} from '@app/constants';
import {DataLoader} from '@app/commons';
import {HomeTopContent, HomeBotContent} from './components';
import {getCurrentWeather, getDeviceCity} from '@app/redux';
import {HomeStyles as Styles} from '@app/assets/styles';

const wait = timeout => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export default function Home({navigation}) {
  const dispatch = useDispatch();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getDeviceCity());

    wait(1000).then(() => {
      setRefreshing(false);
    });
  }, []);

  const {cityAPIResponse, latAPIResponse, error, fetching} = useSelector(
    state => state?.weather || {},
  );

  const [eachHourData, setEachHourData] = useState([]);
  const [selectedHourlyCard, setSelectedHourlyCard] = useState(0);
  const [todaysData, setTodaysData] = useState();

  const todaysDate = moment
    .unix(latAPIResponse?.current?.dt || 1640995200)
    .format('ddd, MMM D');

  useEffect(() => {
    const permissionRequest = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          dispatch(getDeviceCity());
        } else {
          RNBootSplash.hide();
          dispatch(getCurrentWeather({cityName: 'Delhi'}));
          alert('Location permission denied');
        }
      } catch (err) {
        RNBootSplash.hide();
        alert(err);
      }
    };

    permissionRequest();
  }, []);

  useEffect(() => {
    const hourlyWeatherData =
      Array.isArray(latAPIResponse?.hourly) && latAPIResponse?.hourly.length
        ? latAPIResponse?.hourly?.map((item, index) => {
            return index === 0
              ? {...item, isSelected: true}
              : {...item, isSelected: false};
          })
        : [];

    setEachHourData(hourlyWeatherData);

    setSelectedHourlyCard(0);
  }, [latAPIResponse]);

  useEffect(() => {
    error && showError(error);
  }, [error]);

  useEffect(() => {
    setTodaysData(
      Array.isArray(latAPIResponse.daily) && latAPIResponse.daily.length
        ? latAPIResponse?.daily[0]
        : [],
    );
  }, [latAPIResponse]);

  const navigateToDetails = () => {
    navigation.navigate('Details');
  };

  const toggleHourlyIsSelected = (itemId, index) => {
    setEachHourData(
      eachHourData.map(item =>
        item?.dt === itemId
          ? {...item, isSelected: true}
          : {...item, isSelected: false},
      ),
    );

    setSelectedHourlyCard(index);
  };

  return (
    <ScrollView
      style={Styles.mainContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          progressBackgroundColor={Colors.lessWhite}
          colors={[Colors.weatherTimelyCardGradient]}
        />
      }>
      <LinearGradient
        style={Styles.topContainer}
        start={{x: 1, y: 0}}
        end={{x: 1, y: 1}}
        colors={[
          Colors.topContainerBackground,
          Colors.weatherTimelyCardGradient,
        ]}
        locations={[0.1, 0.8]}>
        {fetching ? (
          <DataLoader size={50} />
        ) : (
          <HomeTopContent
            location={cityAPIResponse?.city?.name || 'service down'}
            date={todaysDate}
            image={eachHourData[selectedHourlyCard]?.weather[0]?.icon}
            temp={Math.round(eachHourData[selectedHourlyCard]?.temp) || 0}
            description={
              eachHourData[selectedHourlyCard]?.weather[0]?.description ||
              'service down'
            }
            humidity={eachHourData[selectedHourlyCard]?.humidity || 0}
            wind={eachHourData[selectedHourlyCard]?.wind_speed || 0}
            visibility={eachHourData[selectedHourlyCard]?.visibility || 0}
            highestTemp={todaysData?.temp?.max || 0}
            lowestTemp={todaysData?.temp?.min || 0}
          />
        )}
      </LinearGradient>

      <View style={Styles.bottomContainer}>
        <HomeBotContent
          onPressNavigate={navigateToDetails}
          hourlyData={eachHourData}
          fetching={fetching}
          toggleSelected={toggleHourlyIsSelected}
        />
      </View>
    </ScrollView>
  );
}
